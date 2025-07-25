import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  symbol?: string;
  analysisType: 'market_overview' | 'technical_analysis' | 'risk_assessment' | 'strategy_recommendation';
  timeframe?: string;
  userQuery?: string;
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

    const { symbol, analysisType, timeframe, userQuery }: AnalysisRequest = await req.json();
    console.log(`Processing ${analysisType} analysis for ${symbol || 'general'} by user ${user.id}`);

    // Get latest market data
    let marketContext = '';
    if (symbol) {
      const { data: marketData } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (marketData && marketData.length > 0) {
        marketContext = `Current market data for ${symbol}:\n${marketData.map(d => 
          `Price: $${d.price}, Change: ${d.change_percent_24h}%, Volume: ${d.volume_24h}, High: $${d.high_24h}, Low: $${d.low_24h}`
        ).join('\n')}`;
      }
    }

    // Get user's trading bots for context
    const { data: userBots } = await supabase
      .from('trading_bots')
      .select('symbol, strategy, status, current_balance, daily_pnl, win_rate')
      .eq('user_id', user.id)
      .limit(10);

    const botContext = userBots && userBots.length > 0 ? 
      `User's current trading bots:\n${userBots.map(bot => 
        `${bot.symbol} (${bot.strategy}): ${bot.status}, Balance: $${bot.current_balance}, Daily P&L: $${bot.daily_pnl}, Win Rate: ${bot.win_rate}%`
      ).join('\n')}` : 'User has no active trading bots.';

    // Prepare prompt based on analysis type
    let systemPrompt = `You are an expert cryptocurrency trading analyst with deep knowledge of market dynamics, technical analysis, and risk management. Provide professional, actionable insights.`;
    
    let userPrompt = '';
    
    switch (analysisType) {
      case 'market_overview':
        userPrompt = `Provide a comprehensive market overview${symbol ? ` for ${symbol}` : ' for the cryptocurrency market'}. Include:
1. Current market sentiment and trend analysis
2. Key support and resistance levels
3. Volume analysis and market strength
4. Short-term and medium-term outlook
5. Important factors affecting price movement

${marketContext}
${botContext}

Please provide actionable insights in a clear, structured format.`;
        break;

      case 'technical_analysis':
        userPrompt = `Perform detailed technical analysis${symbol ? ` for ${symbol}` : ' for major cryptocurrencies'}. Include:
1. Chart pattern analysis
2. Key technical indicators (RSI, MACD, Moving Averages)
3. Entry and exit points
4. Stop-loss and take-profit recommendations
5. Risk-reward ratio assessment

${marketContext}
${botContext}

Focus on actionable trading signals and risk management.`;
        break;

      case 'risk_assessment':
        userPrompt = `Conduct a comprehensive risk assessment${symbol ? ` for ${symbol}` : ' for the current portfolio'}. Include:
1. Market volatility analysis
2. Correlation risks with other assets
3. Liquidity assessment
4. Maximum drawdown potential
5. Position sizing recommendations

${marketContext}
${botContext}

Provide specific risk mitigation strategies and portfolio adjustments.`;
        break;

      case 'strategy_recommendation':
        userPrompt = `Recommend optimal trading strategies${symbol ? ` for ${symbol}` : ' for the current market conditions'}. Include:
1. Best strategy types for current market (scalping, swing, momentum)
2. Optimal timeframes and parameters
3. Risk management rules
4. Entry and exit criteria
5. Performance expectations

${marketContext}
${botContext}

Tailor recommendations to the user's current bot portfolio and risk profile.`;
        break;

      default:
        if (userQuery) {
          userPrompt = `Answer this trading-related question: ${userQuery}

Context:
${marketContext}
${botContext}

Provide professional advice with specific actionable recommendations.`;
        } else {
          throw new Error('Invalid analysis type or missing user query');
        }
    }

    // Call Google AI (Gemini)
    console.log('Calling Google AI API for analysis...');
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
                text: `${systemPrompt}\n\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
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
    console.log('Google AI response received');

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Google AI');
    }

    const analysis = data.candidates[0].content.parts[0].text;

    // Store analysis in database for future reference
    const { error: insertError } = await supabase
      .from('system_config')
      .upsert({
        user_id: user.id,
        config_key: `ai_analysis_${analysisType}_${symbol || 'general'}_${Date.now()}`,
        config_value: {
          analysis_type: analysisType,
          symbol: symbol,
          analysis: analysis,
          timestamp: new Date().toISOString(),
          market_context: marketContext
        }
      });

    if (insertError) {
      console.error('Error storing analysis:', insertError);
      // Don't fail the request if storage fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      analysis: analysis,
      analysisType: analysisType,
      symbol: symbol,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-market-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});