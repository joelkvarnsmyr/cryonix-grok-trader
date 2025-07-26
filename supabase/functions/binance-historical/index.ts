import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HistoricalRequest {
  symbol: string;
  interval: string;
  startTime: number;
  endTime: number;
  limit?: number;
}

interface BacktestParams {
  symbol: string;
  startDate: string;
  endDate: string;
  strategy: string;
  initialCapital: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { action, ...params } = await req.json()

    if (action === 'getHistoricalData') {
      return await getHistoricalData(params as HistoricalRequest)
    } else if (action === 'runBacktest') {
      return await runBacktest(params as BacktestParams, user.id, supabaseClient)
    }

    return new Response('Invalid action', { status: 400 })

  } catch (error) {
    console.error('Error in binance-historical:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getHistoricalData(params: HistoricalRequest) {
  const apiKey = Deno.env.get('BINANCE_TESTNET_API_KEY')
  
  if (!apiKey) {
    throw new Error('Binance API key not configured')
  }

  const { symbol, interval, startTime, endTime, limit = 1000 } = params
  
  const baseUrl = 'https://testnet.binance.vision/api/v3/klines'
  const queryParams = new URLSearchParams({
    symbol,
    interval,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
    limit: limit.toString()
  })

  const url = `${baseUrl}?${queryParams}`
  
  const response = await fetch(url, {
    headers: {
      'X-MBX-APIKEY': apiKey
    }
  })

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Transform Binance kline data to our format
  const historicalData = data.map((kline: any[]) => ({
    timestamp: new Date(kline[0]),
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5])
  }))

  return new Response(JSON.stringify({ data: historicalData }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function runBacktest(params: BacktestParams, userId: string, supabaseClient: any) {
  const { symbol, startDate, endDate, strategy, initialCapital } = params
  
  // Get historical data
  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()
  
  const historicalResponse = await getHistoricalData({
    symbol,
    interval: '1h',
    startTime,
    endTime
  })
  
  const { data: historicalData } = await historicalResponse.json()
  
  // Simple SMA strategy implementation
  const trades = []
  let position = null
  let balance = initialCapital
  let totalTrades = 0
  let winningTrades = 0
  
  for (let i = 20; i < historicalData.length; i++) {
    const current = historicalData[i]
    const sma20 = calculateSMA(historicalData.slice(i-20, i), 20)
    const sma50 = calculateSMA(historicalData.slice(i-50, i), 50)
    
    // Buy signal: SMA20 crosses above SMA50
    if (sma20 > sma50 && !position) {
      position = {
        type: 'buy',
        price: current.close,
        quantity: balance / current.close,
        timestamp: current.timestamp
      }
    }
    
    // Sell signal: SMA20 crosses below SMA50
    if (sma20 < sma50 && position) {
      const pnl = (current.close - position.price) * position.quantity
      balance += pnl
      
      trades.push({
        symbol,
        action: 'sell',
        quantity: position.quantity,
        price: current.close,
        pnl,
        timestamp: current.timestamp
      })
      
      totalTrades++
      if (pnl > 0) winningTrades++
      
      position = null
    }
  }
  
  // Calculate metrics
  const totalReturn = ((balance - initialCapital) / initialCapital) * 100
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  const profitFactor = calculateProfitFactor(trades)
  const maxDrawdown = calculateMaxDrawdown(trades, initialCapital)
  const sharpeRatio = calculateSharpeRatio(trades)
  
  // Store results in database
  const backtestResult = {
    user_id: userId,
    symbol,
    strategy,
    start_date: startDate,
    end_date: endDate,
    initial_capital: initialCapital,
    final_balance: balance,
    total_return: totalReturn,
    total_trades: totalTrades,
    winning_trades: winningTrades,
    win_rate: winRate,
    profit_factor: profitFactor,
    max_drawdown: maxDrawdown,
    sharpe_ratio: sharpeRatio
  }
  
  return new Response(JSON.stringify({ 
    success: true, 
    result: backtestResult,
    trades: trades.slice(-10) // Return last 10 trades
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function calculateSMA(data: any[], period: number): number {
  if (data.length < period) return 0
  const sum = data.slice(-period).reduce((acc, item) => acc + item.close, 0)
  return sum / period
}

function calculateProfitFactor(trades: any[]): number {
  const profits = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0)
  const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0))
  return losses > 0 ? profits / losses : profits > 0 ? 2.0 : 0
}

function calculateMaxDrawdown(trades: any[], initialCapital: number): number {
  let peak = initialCapital
  let maxDrawdown = 0
  let runningBalance = initialCapital
  
  for (const trade of trades) {
    runningBalance += trade.pnl
    if (runningBalance > peak) peak = runningBalance
    const drawdown = ((peak - runningBalance) / peak) * 100
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  
  return maxDrawdown
}

function calculateSharpeRatio(trades: any[]): number {
  if (trades.length < 2) return 0
  
  const returns = trades.map(t => t.pnl)
  const avgReturn = returns.reduce((acc, r) => acc + r, 0) / returns.length
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  
  return stdDev > 0 ? avgReturn / stdDev : 0
}