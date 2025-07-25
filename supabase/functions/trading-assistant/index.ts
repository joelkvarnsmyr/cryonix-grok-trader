import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  conversationId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleAIKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleAIKey) {
      throw new Error('Google AI API key not configured');
    }

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

    const { message, conversationId }: ChatRequest = await req.json();
    console.log(`Processing chat message from user ${user.id}`);

    // Get user's trading context
    const { data: userBots } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: marketData } = await supabase
      .from('market_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    // Build context for AI
    const botContext = userBots && userBots.length > 0 ? 
      `User's trading bots:\n${userBots.map(bot => 
        `- ${bot.name} (${bot.symbol}): ${bot.status}, Strategy: ${bot.strategy}, Balance: $${bot.current_balance}, Daily P&L: $${bot.daily_pnl}, Win Rate: ${bot.win_rate}%`
      ).join('\n')}` : 'User has no active trading bots.';

    const tradeContext = recentTrades && recentTrades.length > 0 ?
      `Recent trades:\n${recentTrades.slice(0, 5).map(trade => 
        `- ${trade.action.toUpperCase()} ${trade.quantity} ${trade.symbol} at $${trade.price} (${trade.status})`
      ).join('\n')}` : 'No recent trades.';

    const marketContext = marketData && marketData.length > 0 ?
      `Current market data:\n${marketData.slice(0, 5).map(data => 
        `- ${data.symbol}: $${data.price} (${data.change_percent_24h > 0 ? '+' : ''}${data.change_percent_24h}%)`
      ).join('\n')}` : 'No market data available.';

    // Get conversation history if provided
    let conversationHistory = '';
    if (conversationId) {
      const { data: history } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', `chat_history_${conversationId}`)
        .single();

      if (history && history.config_value) {
        conversationHistory = history.config_value.messages || '';
      }
    }

    const systemPrompt = `You are CryonixAI, an expert cryptocurrency trading assistant. You help users with:
1. Market analysis and trading strategies
2. Risk management and portfolio optimization  
3. Technical analysis and chart interpretation
4. Trading bot configuration and optimization
5. General crypto market insights

IMPORTANT GUIDELINES:
- Always provide actionable, specific advice
- Include risk warnings when appropriate
- Reference user's current positions and bots when relevant
- Use clear, professional language
- Never guarantee profits or specific outcomes
- Suggest risk management strategies

User Context:
${botContext}

${tradeContext}

${marketContext}

${conversationHistory ? `Previous conversation:\n${conversationHistory}` : ''}

Respond helpfully and professionally to the user's trading questions and requests.`;

    // Call Google AI (Gemini)
    console.log('Calling Google AI API for chat response...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleAIKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser: ${message}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', errorText);
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Google AI chat response received');

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Google AI');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    // Store conversation history
    const newConversationId = conversationId || `conv_${Date.now()}`;
    const updatedHistory = conversationHistory + 
      `\nUser: ${message}\nCryonixAI: ${aiResponse}\n`;

    const { error: historyError } = await supabase
      .from('system_config')
      .upsert({
        user_id: user.id,
        config_key: `chat_history_${newConversationId}`,
        config_value: {
          messages: updatedHistory,
          last_updated: new Date().toISOString()
        }
      });

    if (historyError) {
      console.error('Error storing chat history:', historyError);
      // Don't fail the request if storage fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      response: aiResponse,
      conversationId: newConversationId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trading-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});