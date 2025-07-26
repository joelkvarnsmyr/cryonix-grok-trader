import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradingLoopRequest {
  action: 'start' | 'stop' | 'check_status';
  interval?: number; // minutes, default 5
}

// Global state for the autonomous loop
let isLoopRunning = false;
let loopIntervalId: number | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

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

    const { action, interval = 5 }: TradingLoopRequest = await req.json();

    switch (action) {
      case 'start':
        if (isLoopRunning) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Autonomous loop is already running' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await startAutonomousLoop(supabase, user.id, interval);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Autonomous trading loop started with ${interval} minute interval`,
          interval 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stop':
        stopAutonomousLoop();
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Autonomous trading loop stopped' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'check_status':
        return new Response(JSON.stringify({ 
          success: true, 
          isRunning: isLoopRunning,
          message: isLoopRunning ? 'Loop is running' : 'Loop is stopped'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in autonomous-trading-loop function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startAutonomousLoop(supabase: any, userId: string, intervalMinutes: number) {
  isLoopRunning = true;
  
  // Log loop start
  await logSystemActivity(supabase, userId, 'system', 'Autonomous Loop Started', `Trading loop started with ${intervalMinutes} minute interval`, 'success');

  // Define configurable watchlist pairs
  const watchlistPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];

  // Main autonomous loop
  const runTradingCycle = async () => {
    if (!isLoopRunning) return;

    console.log(`Starting trading cycle at ${new Date().toISOString()}`);
    
    try {
      // 1. Fetch comprehensive market data first
      await updateMarketDataCache(supabase, userId, watchlistPairs);
      
      // 2. Check if it's near end of day (23:55 UTC) - close positions
      const now = new Date();
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();
      
      if (hour === 23 && minute >= 55) {
        await closeAllPositions(supabase, userId);
        return;
      }

      // Get active trading bots
      const { data: activeBots } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'running');

      if (!activeBots || activeBots.length === 0) {
        console.log('No active bots found');
        return;
      }

      // Process each active bot
      for (const bot of activeBots) {
        if (!isLoopRunning) break;
        
        try {
          await processBotTradingCycle(supabase, userId, bot);
        } catch (error) {
          console.error(`Error processing bot ${bot.id}:`, error);
          await logSystemActivity(supabase, userId, bot.id, 'Bot Processing Error', `Error in trading cycle: ${error.message}`, 'error');
        }
      }

    } catch (error) {
      console.error('Error in trading cycle:', error);
      await logSystemActivity(supabase, userId, 'system', 'Trading Cycle Error', `Error in autonomous loop: ${error.message}`, 'error');
    }
  };

  // Start the interval
  loopIntervalId = setInterval(runTradingCycle, intervalMinutes * 60 * 1000);
  
  // Run immediately
  await runTradingCycle();
}

function stopAutonomousLoop() {
  isLoopRunning = false;
  if (loopIntervalId) {
    clearInterval(loopIntervalId);
    loopIntervalId = null;
  }
}

async function processBotTradingCycle(supabase: any, userId: string, bot: any) {
  console.log(`Processing trading cycle for bot ${bot.id} (${bot.symbol})`);
  
  // 1. Get market data
  const marketData = await getLatestMarketData(supabase, bot.symbol);
  if (!marketData) {
    await logBotActivity(supabase, userId, bot.id, 'error', 'No Market Data', `No market data available for ${bot.symbol}`, 'warning');
    return;
  }

  // 2. Generate self-question and analyze with AI
  const analysisResult = await analyzeMarketWithAI(supabase, userId, bot, marketData);
  if (!analysisResult) {
    return;
  }

  // 3. Advanced risk validation
  const riskValidation = await validateTradeRisk(supabase, userId, bot, analysisResult);
  if (!riskValidation.approved) {
    await logBotActivity(supabase, userId, bot.id, 'risk_rejected', 'Trade Rejected by Risk Management', riskValidation.reason, 'warning');
    return;
  }

  // 4. Execute trade if approved
  if (analysisResult.decision !== 'hold') {
    await executeTrade(supabase, userId, bot, analysisResult, riskValidation.adjustedQuantity);
  }
}

async function getLatestMarketData(supabase: any, symbol: string) {
  const { data } = await supabase
    .from('market_data')
    .select('*')
    .eq('symbol', symbol)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  return data;
}

async function analyzeMarketWithAI(supabase: any, userId: string, bot: any, marketData: any) {
  try {
    // Call the market analysis function
    const { data, error } = await supabase.functions.invoke('market-analysis-ai', {
      body: {
        botId: bot.id,
        symbol: bot.symbol,
        marketData: marketData,
        riskSettings: bot.risk_settings
      }
    });

    if (error) {
      console.error('Market analysis error:', error);
      await logBotActivity(supabase, userId, bot.id, 'error', 'Analysis Failed', `Market analysis failed: ${error.message}`, 'error');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error calling market analysis:', error);
    await logBotActivity(supabase, userId, bot.id, 'error', 'Analysis Error', `Failed to analyze market: ${error.message}`, 'error');
    return null;
  }
}

async function validateTradeRisk(supabase: any, userId: string, bot: any, analysisResult: any) {
  // Get current daily trades count
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTrades } = await supabase
    .from('trades')
    .select('id')
    .eq('user_id', userId)
    .eq('bot_id', bot.id)
    .gte('created_at', today + 'T00:00:00.000Z')
    .lt('created_at', today + 'T23:59:59.999Z');

  const dailyTradeCount = todayTrades?.length || 0;

  // Risk validation rules
  const maxDailyTrades = 10;
  const maxPositionSize = bot.current_balance * 0.05; // 5% of balance
  const minPositionSize = 10; // Minimum $10 trade

  // Check daily trade limit
  if (dailyTradeCount >= maxDailyTrades) {
    return {
      approved: false,
      reason: `Daily trade limit reached (${dailyTradeCount}/${maxDailyTrades})`
    };
  }

  // Check confidence threshold
  if (analysisResult.confidence < 60) {
    return {
      approved: false,
      reason: `Confidence too low (${analysisResult.confidence}% < 60%)`
    };
  }

  // Adjust quantity based on risk settings
  let quantity = analysisResult.suggestedQuantity;
  
  if (quantity > maxPositionSize) {
    quantity = maxPositionSize;
  }
  
  if (quantity < minPositionSize) {
    return {
      approved: false,
      reason: `Trade size too small ($${quantity} < $${minPositionSize})`
    };
  }

  return {
    approved: true,
    adjustedQuantity: quantity,
    reason: 'Trade approved by risk management'
  };
}

async function executeTrade(supabase: any, userId: string, bot: any, analysisResult: any, quantity: number) {
  try {
    // Call the trading bot function to execute
    const { error } = await supabase.functions.invoke('trading-bot', {
      body: {
        action: 'execute_autonomous_trade',
        botId: bot.id,
        decision: analysisResult.decision,
        quantity: quantity,
        confidence: analysisResult.confidence,
        reason: analysisResult.reasoning
      }
    });

    if (error) {
      console.error('Trade execution error:', error);
      await logBotActivity(supabase, userId, bot.id, 'error', 'Trade Execution Failed', `Failed to execute trade: ${error.message}`, 'error');
    }
  } catch (error) {
    console.error('Error executing trade:', error);
    await logBotActivity(supabase, userId, bot.id, 'error', 'Trade Error', `Trade execution error: ${error.message}`, 'error');
  }
}

async function closeAllPositions(supabase: any, userId: string) {
  console.log('End of day - closing all positions');
  
  // Get all active bots
  const { data: activeBots } = await supabase
    .from('trading_bots')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'running');

  if (!activeBots) return;

  for (const bot of activeBots) {
    try {
      // Force sell all positions for this bot
      await supabase.functions.invoke('trading-bot', {
        body: {
          action: 'close_all_positions',
          botId: bot.id
        }
      });

      await logBotActivity(supabase, userId, bot.id, 'end_of_day', 'Positions Closed', 'All positions closed for end of day', 'info');
    } catch (error) {
      console.error(`Error closing positions for bot ${bot.id}:`, error);
      await logBotActivity(supabase, userId, bot.id, 'error', 'Position Close Error', `Failed to close positions: ${error.message}`, 'error');
    }
  }
}

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

async function updateMarketDataCache(supabase: any, userId: string, symbols: string[]) {
  try {
    // Fetch comprehensive market data using the new enhanced function
    const promises = [
      // Realtime data
      supabase.functions.invoke('enhanced-market-data', {
        body: { action: 'fetch_realtime', symbols }
      }),
      // Sentiment data
      supabase.functions.invoke('enhanced-market-data', {
        body: { action: 'fetch_sentiment', symbols }
      })
    ];

    const [realtimeResponse, sentimentResponse] = await Promise.all(promises);

    // Update market_data table with fresh data
    if (realtimeResponse.data?.success && realtimeResponse.data?.data) {
      for (const marketData of realtimeResponse.data.data) {
        await supabase
          .from('market_data')
          .upsert({
            symbol: marketData.symbol,
            price: marketData.price,
            change_24h: marketData.change_24h,
            change_percent_24h: marketData.change_percent_24h,
            volume_24h: marketData.volume_24h,
            high_24h: marketData.high_24h,
            low_24h: marketData.low_24h,
            timestamp: marketData.timestamp
          });
      }
    }

    // Log sentiment data as system activity
    if (sentimentResponse.data?.success && sentimentResponse.data?.data) {
      const sentiment = sentimentResponse.data.data;
      await logSystemActivity(
        supabase, 
        userId, 
        'system', 
        'Market Sentiment Updated', 
        `Overall market: ${sentiment.overall_market_sentiment}`,
        'info',
        { sentimentData: sentiment }
      );
    }

    await logSystemActivity(supabase, userId, 'system', 'Market Data Updated', `Updated data for ${symbols.join(', ')}`, 'success');
    
  } catch (error) {
    console.error('Error updating market data cache:', error);
    await logSystemActivity(supabase, userId, 'system', 'Market Data Error', `Failed to update market data: ${error.message}`, 'error');
  }
}

async function logSystemActivity(supabase: any, userId: string, botId: string, title: string, description: string, status: string = 'info', data: any = {}) {
  await logBotActivity(supabase, userId, botId, 'system', title, description, status, data);
}