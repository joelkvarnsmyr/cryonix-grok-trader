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

async function generateTradeSignal(supabase: any, botId: string, userId: string) {
  // Get bot details
  const { data: bot } = await supabase
    .from('trading_bots')
    .select('*')
    .eq('id', botId)
    .single();

  if (!bot) return;

  // Get latest market data for bot's symbol
  const { data: marketData } = await supabase
    .from('market_data')
    .select('*')
    .eq('symbol', bot.symbol)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (!marketData) return;

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
    // Create trade record
    const { error } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        bot_id: botId,
        symbol: signal.symbol,
        action: signal.action,
        quantity: signal.quantity,
        price: marketData.price,
        total_value: signal.quantity * marketData.price,
        confidence: signal.confidence,
        notes: signal.reason,
        status: 'pending'
      });

    if (error) {
      console.error('Error creating trade:', error);
    } else {
      console.log(`Generated ${signal.action} signal for ${signal.symbol}`);
    }
  }
}