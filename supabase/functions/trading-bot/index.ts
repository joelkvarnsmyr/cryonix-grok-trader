import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BotAction {
  action: 'start' | 'stop' | 'pause' | 'update_settings';
  botId: string;
  settings?: {
    riskLevel?: number;
    maxTradeAmount?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
}

interface TradeSignal {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  confidence: number;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { action, botId, settings }: BotAction = await req.json();
    console.log(`Processing ${action} for bot ${botId} by user ${user.id}`);

    switch (action) {
      case 'start':
        // Update bot status to running
        const { error: startError } = await supabase
          .from('trading_bots')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', botId)
          .eq('user_id', user.id);

        if (startError) throw startError;

        // Log bot start activity
        await logBotActivity(supabase, user.id, botId, 'status_change', 'Bot Started', 'Trading bot has been started and is now active', 'success');

        // Generate initial trade signal (demo logic)
        await generateTradeSignal(supabase, botId, user.id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Bot started successfully',
          botId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stop':
        const { error: stopError } = await supabase
          .from('trading_bots')
          .update({ 
            status: 'stopped',
            updated_at: new Date().toISOString()
          })
          .eq('id', botId)
          .eq('user_id', user.id);

        if (stopError) throw stopError;
        
        // Log bot stop activity
        await logBotActivity(supabase, user.id, botId, 'status_change', 'Bot Stopped', 'Trading bot has been stopped and is no longer active', 'warning');
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Bot stopped successfully',
          botId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'pause':
        const { error: pauseError } = await supabase
          .from('trading_bots')
          .update({ 
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('id', botId)
          .eq('user_id', user.id);

        if (pauseError) throw pauseError;
        
        // Log bot pause activity
        await logBotActivity(supabase, user.id, botId, 'status_change', 'Bot Paused', 'Trading bot has been paused and will not execute new trades', 'info');
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Bot paused successfully',
          botId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'update_settings':
        const { error: updateError } = await supabase
          .from('trading_bots')
          .update({ 
            risk_settings: settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', botId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Bot settings updated successfully',
          botId,
          settings 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in trading-bot function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logBotActivity(supabase: any, userId: string, botId: string, activityType: string, title: string, description: string, status: string = 'info', data: any = {}) {
  try {
    await supabase
      .from('bot_activities')
      .insert({
        user_id: userId,
        bot_id: botId,
        activity_type: activityType,
        title,
        description,
        status,
        data
      });
  } catch (error) {
    console.error('Error logging bot activity:', error);
  }
}

async function executeRealTrade(supabase: any, botId: string, userId: string, signal: TradeSignal, marketPrice: number) {
  const binanceApiKey = Deno.env.get('BINANCE_TESTNET_API_KEY');
  const binanceSecret = Deno.env.get('BINANCE_TESTNET_SECRET_KEY');
  
  if (!binanceApiKey || !binanceSecret) {
    console.error('Binance API credentials not found');
    await logBotActivity(supabase, userId, botId, 'error', 'API Credentials Missing', 'Binance testnet API credentials not configured', 'error');
    return;
  }

  try {
    // Log signal generation
    await logBotActivity(supabase, userId, botId, 'trade_signal', `${signal.action.toUpperCase()} Signal Generated`, signal.reason, 'info', {
      symbol: signal.symbol,
      action: signal.action,
      quantity: signal.quantity,
      confidence: signal.confidence,
      price: marketPrice
    });

    // Create initial trade record
    const { data: tradeRecord, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        bot_id: botId,
        symbol: signal.symbol,
        action: signal.action,
        quantity: signal.quantity,
        price: marketPrice,
        total_value: signal.quantity * marketPrice,
        confidence: signal.confidence,
        notes: signal.reason,
        status: 'pending'
      })
      .select()
      .single();

    if (tradeError) {
      console.error('Error creating trade record:', tradeError);
      await logBotActivity(supabase, userId, botId, 'error', 'Trade Record Error', `Failed to create trade record: ${tradeError.message}`, 'error');
      return;
    }

    // Prepare Binance order
    const timestamp = Date.now();
    const symbol = signal.symbol;
    const side = signal.action.toUpperCase();
    const type = 'MARKET';
    
    // Calculate quantity based on balance and market price
    let orderQuantity;
    if (signal.action === 'buy') {
      // For buy orders, calculate quantity based on USDT balance
      orderQuantity = (signal.quantity / marketPrice).toFixed(6);
    } else {
      // For sell orders, use the actual crypto quantity
      orderQuantity = signal.quantity.toFixed(6);
    }

    const queryString = `symbol=${symbol}&side=${side}&type=${type}&quantity=${orderQuantity}&timestamp=${timestamp}`;
    
    // Create signature
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(binanceSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(queryString)
    );
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Execute order on Binance testnet
    const orderResponse = await fetch('https://testnet.binance.vision/api/v3/order', {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': binanceApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `${queryString}&signature=${signatureHex}`
    });

    const orderResult = await orderResponse.json();
    
    if (orderResponse.ok && orderResult.orderId) {
      // Order successful
      await logBotActivity(supabase, userId, botId, 'order_placed', `${side} Order Placed`, `Order ${orderResult.orderId} placed successfully for ${orderQuantity} ${symbol}`, 'success', {
        orderId: orderResult.orderId,
        symbol: symbol,
        side: side,
        quantity: orderQuantity,
        price: marketPrice
      });

      // Update trade record with exchange order ID
      await supabase
        .from('trades')
        .update({
          exchange_order_id: orderResult.orderId.toString(),
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', tradeRecord.id);

      // Update bot balance and stats
      const { data: currentBot } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (currentBot) {
        let newBalance = currentBot.current_balance;
        let newTotalTrades = currentBot.total_trades + 1;
        
        if (signal.action === 'buy') {
          // Buying crypto with USDT
          newBalance -= signal.quantity;
        } else {
          // Selling crypto for USDT  
          newBalance += signal.quantity * marketPrice;
        }

        await supabase
          .from('trading_bots')
          .update({
            current_balance: newBalance,
            total_trades: newTotalTrades,
            daily_trades: currentBot.daily_trades + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', botId);

        await logBotActivity(supabase, userId, botId, 'order_filled', `Order Executed`, `${side} order filled. New balance: ${newBalance.toFixed(2)} USDT`, 'success', {
          newBalance: newBalance,
          totalTrades: newTotalTrades
        });
      }

    } else {
      // Order failed
      console.error('Binance order failed:', orderResult);
      await logBotActivity(supabase, userId, botId, 'error', `${side} Order Failed`, `Order failed: ${orderResult.msg || 'Unknown error'}`, 'error', orderResult);
      
      // Update trade record as failed
      await supabase
        .from('trades')
        .update({
          status: 'failed',
          notes: `${signal.reason} | Order failed: ${orderResult.msg || 'Unknown error'}`
        })
        .eq('id', tradeRecord.id);
    }

  } catch (error) {
    console.error('Error executing trade:', error);
    await logBotActivity(supabase, userId, botId, 'error', 'Trade Execution Error', `Failed to execute trade: ${error.message}`, 'error', { error: error.message });
  }
}

async function generateTradeSignal(supabase: any, botId: string, userId: string) {
  // Get bot details
  const { data: bot } = await supabase
    .from('trading_bots')
    .select('*')
    .eq('id', botId)
    .single();

  if (!bot) return;

  await logBotActivity(supabase, userId, botId, 'analysis', 'Market Analysis Started', `Analyzing market conditions for ${bot.symbol}`, 'info');

  // Get latest market data for bot's symbol
  const { data: marketData } = await supabase
    .from('market_data')
    .select('*')
    .eq('symbol', bot.symbol)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (!marketData) {
    await logBotActivity(supabase, userId, botId, 'error', 'No Market Data', `No market data available for ${bot.symbol}`, 'warning');
    return;
  }

  // Simple trading logic (demo)
  const priceChange = marketData.change_percent_24h;
  let signal: TradeSignal | null = null;

  if (priceChange > 5) {
    // Strong uptrend - sell signal
    signal = {
      symbol: bot.symbol,
      action: 'sell',
      quantity: bot.current_balance * 0.1, // 10% of balance
      confidence: Math.min(85, 60 + (priceChange - 5) * 2),
      reason: `Strong uptrend detected (+${priceChange.toFixed(2)}%)`
    };
  } else if (priceChange < -5) {
    // Strong downtrend - buy signal
    signal = {
      symbol: bot.symbol,
      action: 'buy',
      quantity: bot.current_balance * 0.1,
      confidence: Math.min(85, 60 + Math.abs(priceChange + 5) * 2),
      reason: `Strong downtrend detected (${priceChange.toFixed(2)}%) - buy opportunity`
    };
  }

  if (signal) {
    // Execute real trade on Binance testnet
    await executeRealTrade(supabase, botId, userId, signal, marketData.price);
  } else {
    await logBotActivity(supabase, userId, botId, 'analysis', 'No Trade Signal', `Market conditions not met for trading. Price change: ${priceChange.toFixed(2)}%`, 'info', {
      priceChange: priceChange,
      currentPrice: marketData.price
    });
  }
}