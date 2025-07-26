import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  botId: string;
  symbol: string;
  marketData: any;
  riskSettings: any;
}

interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  rsi: number;
  priceChange: number;
  volumeChange: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google AI API key not configured');
    }

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

    const { botId, symbol, marketData, riskSettings }: AnalysisRequest = await req.json();

    // 1. Calculate technical indicators
    const technicalIndicators = await calculateTechnicalIndicators(supabase, symbol);
    
    // 2. Generate self-question based on market conditions
    const selfQuestion = generateSelfQuestion(symbol, marketData, technicalIndicators);
    
    // 3. Analyze with Google AI
    const aiAnalysis = await analyzeWithGoogleAI(googleApiKey, selfQuestion, marketData, technicalIndicators, riskSettings);
    
    // 4. Log the analysis
    await logAnalysis(supabase, user.id, botId, selfQuestion, aiAnalysis);

    return new Response(JSON.stringify(aiAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in market-analysis-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function calculateTechnicalIndicators(supabase: any, symbol: string): Promise<TechnicalIndicators> {
  // Get historical data for technical indicators
  const { data: historicalData } = await supabase
    .from('market_data')
    .select('price, volume_24h, timestamp')
    .eq('symbol', symbol)
    .order('timestamp', { ascending: false })
    .limit(50);

  if (!historicalData || historicalData.length < 20) {
    // Return default values if insufficient data
    return {
      sma20: 0,
      sma50: 0,
      rsi: 50,
      priceChange: 0,
      volumeChange: 0
    };
  }

  const prices = historicalData.map(d => d.price);
  const volumes = historicalData.map(d => d.volume_24h);

  // Calculate Simple Moving Averages
  const sma20 = prices.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = prices.length >= 50 ? prices.slice(0, 50).reduce((a, b) => a + b, 0) / 50 : sma20;

  // Calculate RSI (simplified)
  const rsi = calculateRSI(prices.slice(0, 14));

  // Calculate price and volume changes
  const priceChange = prices.length >= 2 ? ((prices[0] - prices[1]) / prices[1]) * 100 : 0;
  const volumeChange = volumes.length >= 2 ? ((volumes[0] - volumes[1]) / volumes[1]) * 100 : 0;

  return {
    sma20,
    sma50,
    rsi,
    priceChange,
    volumeChange
  };
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i - 1] - prices[i];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function generateSelfQuestion(symbol: string, marketData: any, indicators: TechnicalIndicators): string {
  const priceChange = marketData.change_percent_24h;
  const price = marketData.price;
  
  // Determine market condition triggers
  const triggers = [];
  
  if (Math.abs(priceChange) > 5) {
    triggers.push(priceChange > 0 ? "strong uptrend" : "strong downtrend");
  }
  
  if (indicators.rsi < 30) {
    triggers.push("oversold RSI");
  } else if (indicators.rsi > 70) {
    triggers.push("overbought RSI");
  }
  
  if (indicators.sma20 > indicators.sma50) {
    triggers.push("bullish SMA crossover");
  } else if (indicators.sma20 < indicators.sma50) {
    triggers.push("bearish SMA crossover");
  }
  
  if (indicators.volumeChange > 20) {
    triggers.push("high volume spike");
  }

  // Generate contextual question
  const action = priceChange > 2 ? "sell" : priceChange < -2 ? "buy" : "hold";
  const triggerText = triggers.length > 0 ? triggers.join(" and ") : "current market conditions";
  
  return `Should we ${action} ${symbol} based on ${triggerText}? Current price: $${price.toFixed(4)}, 24h change: ${priceChange.toFixed(2)}%, RSI: ${indicators.rsi.toFixed(1)}`;
}

async function analyzeWithGoogleAI(apiKey: string, question: string, marketData: any, indicators: TechnicalIndicators, riskSettings: any) {
  const systemPrompt = `You are an expert cryptocurrency trading assistant. Analyze the market data and answer the trading question with a specific decision.

IMPORTANT: You must respond with a valid JSON object containing exactly these fields:
- decision: "buy", "sell", or "hold"
- confidence: number between 0-100
- reasoning: string explaining your decision
- suggestedQuantity: number (suggested trade amount in USD)

Consider these factors:
1. Price trends and momentum
2. Technical indicators (RSI, SMA)
3. Volume patterns
4. Risk management principles
5. Market volatility

Be conservative with suggestions and prioritize capital preservation.`;

  const userPrompt = `${question}

Market Data:
- Current Price: $${marketData.price}
- 24h Change: ${marketData.change_percent_24h.toFixed(2)}%
- 24h Volume: $${marketData.volume_24h.toLocaleString()}
- Market Cap: $${marketData.market_cap?.toLocaleString() || 'N/A'}

Technical Indicators:
- RSI: ${indicators.rsi.toFixed(1)}
- SMA20: $${indicators.sma20.toFixed(4)}
- SMA50: $${indicators.sma50.toFixed(4)}
- Price Change (5min): ${indicators.priceChange.toFixed(2)}%
- Volume Change: ${indicators.volumeChange.toFixed(2)}%

Risk Settings:
- Max Position: ${((riskSettings?.maxTradeAmount || 0.05) * 100).toFixed(1)}% of balance
- Stop Loss: ${((riskSettings?.stopLoss || 0.02) * 100).toFixed(1)}%
- Risk Level: ${riskSettings?.riskLevel || 'medium'}

Provide your trading recommendation as a JSON response.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      throw new Error('No response from Google AI');
    }

    // Try to parse JSON response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        if (!parsed.decision || !parsed.confidence || !parsed.reasoning) {
          throw new Error('Invalid AI response format');
        }
        
        // Set default quantity if not provided
        if (!parsed.suggestedQuantity) {
          parsed.suggestedQuantity = 50; // Default $50 trade
        }
        
        return {
          ...parsed,
          question,
          aiResponse: aiResponse
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    // Fallback to technical analysis if AI parsing fails
    return fallbackTechnicalAnalysis(question, indicators, marketData);

  } catch (error) {
    console.error('Google AI API error:', error);
    // Fallback to technical analysis
    return fallbackTechnicalAnalysis(question, indicators, marketData);
  }
}

function fallbackTechnicalAnalysis(question: string, indicators: TechnicalIndicators, marketData: any) {
  let decision = 'hold';
  let confidence = 50;
  let reasoning = 'Using technical fallback analysis. ';

  const priceChange = marketData.change_percent_24h;
  const rsi = indicators.rsi;

  if (rsi < 30 && priceChange < -3) {
    decision = 'buy';
    confidence = 65;
    reasoning += 'Oversold condition with significant price drop suggests buying opportunity.';
  } else if (rsi > 70 && priceChange > 3) {
    decision = 'sell';
    confidence = 65;
    reasoning += 'Overbought condition with strong price rise suggests taking profits.';
  } else if (indicators.sma20 > indicators.sma50 && priceChange > 1) {
    decision = 'buy';
    confidence = 55;
    reasoning += 'Bullish SMA crossover with positive momentum.';
  } else {
    reasoning += 'Mixed signals, holding position is safest.';
  }

  return {
    decision,
    confidence,
    reasoning,
    suggestedQuantity: 50,
    question,
    aiResponse: 'Technical fallback analysis used'
  };
}

async function logAnalysis(supabase: any, userId: string, botId: string, question: string, analysis: any) {
  try {
    await supabase
      .from('bot_activities')
      .insert({
        user_id: userId,
        bot_id: botId,
        activity_type: 'market_analysis',
        title: `AI Analysis: ${analysis.decision.toUpperCase()}`,
        description: analysis.reasoning,
        status: 'info',
        data: {
          question,
          decision: analysis.decision,
          confidence: analysis.confidence,
          suggestedQuantity: analysis.suggestedQuantity
        }
      });
  } catch (error) {
    console.error('Error logging analysis:', error);
  }
}