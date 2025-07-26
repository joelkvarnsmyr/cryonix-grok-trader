import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketDataRequest {
  action: 'fetch_realtime' | 'fetch_historical' | 'fetch_sentiment';
  symbols?: string[];
  timeframe?: string;
  limit?: number;
}

interface CachedData {
  timestamp: number;
  data: any;
  expiresAt: number;
}

// In-memory cache with 60 second expiry
const dataCache = new Map<string, CachedData>();
const CACHE_DURATION = 60 * 1000; // 60 seconds

// Watchlist configuration
const WATCHLIST_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];

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

    const { action, symbols = WATCHLIST_SYMBOLS, timeframe = '1m', limit = 50 }: MarketDataRequest = await req.json();

    switch (action) {
      case 'fetch_realtime':
        const realtimeData = await fetchRealtimeData(symbols);
        await logDataFetch(supabase, user.id, 'realtime', symbols, realtimeData.success);
        return new Response(JSON.stringify(realtimeData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'fetch_historical':
        const historicalData = await fetchHistoricalData(symbols, timeframe, limit);
        await logDataFetch(supabase, user.id, 'historical', symbols, historicalData.success);
        return new Response(JSON.stringify(historicalData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'fetch_sentiment':
        const sentimentData = await fetchSentimentData(symbols);
        await logDataFetch(supabase, user.id, 'sentiment', symbols, sentimentData.success);
        return new Response(JSON.stringify(sentimentData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in enhanced-market-data function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchRealtimeData(symbols: string[], retryCount = 0): Promise<any> {
  const cacheKey = `realtime_${symbols.join('_')}`;
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`Using cached realtime data for ${symbols.join(', ')}`);
    return { success: true, data: cached.data, cached: true };
  }

  try {
    console.log(`Fetching realtime data for ${symbols.join(', ')}`);
    
    // Fetch from Binance API
    const promises = symbols.map(async (symbol) => {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${symbol}: ${response.status}`);
      }
      return await response.json();
    });

    const results = await Promise.all(promises);
    
    // Process and normalize data
    const processedData = results.map(ticker => ({
      symbol: ticker.symbol,
      price: parseFloat(ticker.lastPrice),
      change_24h: parseFloat(ticker.priceChange),
      change_percent_24h: parseFloat(ticker.priceChangePercent),
      volume_24h: parseFloat(ticker.volume),
      high_24h: parseFloat(ticker.highPrice),
      low_24h: parseFloat(ticker.lowPrice),
      timestamp: new Date().toISOString()
    }));

    // Cache the data
    setCachedData(cacheKey, processedData);

    console.log(`Successfully fetched realtime data for ${symbols.length} symbols`);
    return { success: true, data: processedData, cached: false };

  } catch (error) {
    console.error(`Error fetching realtime data (attempt ${retryCount + 1}):`, error);
    
    // Retry with exponential backoff (max 3 attempts)
    if (retryCount < 2) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await fetchRealtimeData(symbols, retryCount + 1);
    }

    return { 
      success: false, 
      error: error.message,
      retryCount: retryCount + 1 
    };
  }
}

async function fetchHistoricalData(symbols: string[], timeframe: string, limit: number, retryCount = 0): Promise<any> {
  const cacheKey = `historical_${symbols.join('_')}_${timeframe}_${limit}`;
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`Using cached historical data for ${symbols.join(', ')}`);
    return { success: true, data: cached.data, cached: true };
  }

  try {
    console.log(`Fetching historical data for ${symbols.join(', ')}`);
    
    const promises = symbols.map(async (symbol) => {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data for ${symbol}: ${response.status}`);
      }
      const klines = await response.json();
      
      // Process klines data
      return {
        symbol,
        data: klines.map((kline: any[]) => ({
          timestamp: new Date(kline[0]).toISOString(),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }))
      };
    });

    const results = await Promise.all(promises);
    
    // Cache the data
    setCachedData(cacheKey, results);

    console.log(`Successfully fetched historical data for ${symbols.length} symbols`);
    return { success: true, data: results, cached: false };

  } catch (error) {
    console.error(`Error fetching historical data (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < 2) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await fetchHistoricalData(symbols, timeframe, limit, retryCount + 1);
    }

    return { 
      success: false, 
      error: error.message,
      retryCount: retryCount + 1 
    };
  }
}

async function fetchSentimentData(symbols: string[], retryCount = 0): Promise<any> {
  const cacheKey = `sentiment_${symbols.join('_')}`;
  
  // Check cache first (sentiment data can be cached longer)
  const cached = getCachedData(cacheKey, 300000); // 5 minutes for sentiment
  if (cached) {
    console.log(`Using cached sentiment data for ${symbols.join(', ')}`);
    return { success: true, data: cached.data, cached: true };
  }

  try {
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google AI API key not configured');
    }

    console.log(`Fetching sentiment data for ${symbols.join(', ')}`);
    
    // Generate sentiment analysis prompt
    const prompt = `Analyze the current market sentiment for these cryptocurrencies: ${symbols.join(', ')}. 
    
    Consider recent news, social media trends, and market conditions. Provide a sentiment score from 0-100 for each symbol where:
    - 0-30: Very Bearish
    - 30-45: Bearish  
    - 45-55: Neutral
    - 55-70: Bullish
    - 70-100: Very Bullish
    
    Respond with valid JSON only:
    {
      "analysis_timestamp": "current_time",
      "overall_market_sentiment": "description",
      "symbols": [
        {
          "symbol": "BTCUSDT",
          "sentiment_score": number,
          "sentiment_label": "string",
          "key_factors": ["factor1", "factor2"],
          "social_media_buzz": "low/medium/high"
        }
      ]
    }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
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
    let sentimentData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sentimentData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI sentiment response:', parseError);
      // Fallback to neutral sentiment
      sentimentData = {
        analysis_timestamp: new Date().toISOString(),
        overall_market_sentiment: "Unable to analyze sentiment - using neutral",
        symbols: symbols.map(symbol => ({
          symbol,
          sentiment_score: 50,
          sentiment_label: "Neutral",
          key_factors: ["API parsing error"],
          social_media_buzz: "unknown"
        }))
      };
    }

    // Cache the data
    setCachedData(cacheKey, sentimentData, 300000); // 5 minutes cache

    console.log(`Successfully fetched sentiment data for ${symbols.length} symbols`);
    return { success: true, data: sentimentData, cached: false };

  } catch (error) {
    console.error(`Error fetching sentiment data (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < 2) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await fetchSentimentData(symbols, retryCount + 1);
    }

    // Return fallback neutral sentiment on final failure
    const fallbackData = {
      analysis_timestamp: new Date().toISOString(),
      overall_market_sentiment: "Error fetching sentiment - using neutral fallback",
      symbols: symbols.map(symbol => ({
        symbol,
        sentiment_score: 50,
        sentiment_label: "Neutral (Fallback)",
        key_factors: ["API error"],
        social_media_buzz: "unknown"
      }))
    };

    return { 
      success: false, 
      error: error.message,
      data: fallbackData,
      retryCount: retryCount + 1 
    };
  }
}

function getCachedData(key: string, customDuration?: number): CachedData | null {
  const cached = dataCache.get(key);
  if (!cached) return null;

  const duration = customDuration || CACHE_DURATION;
  const now = Date.now();
  
  if (now > cached.expiresAt) {
    dataCache.delete(key);
    return null;
  }

  return cached;
}

function setCachedData(key: string, data: any, customDuration?: number): void {
  const duration = customDuration || CACHE_DURATION;
  const now = Date.now();
  
  dataCache.set(key, {
    timestamp: now,
    data,
    expiresAt: now + duration
  });

  // Clean up expired entries periodically
  if (dataCache.size > 100) {
    cleanupExpiredCache();
  }
}

function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, cached] of dataCache.entries()) {
    if (now > cached.expiresAt) {
      dataCache.delete(key);
    }
  }
}

async function logDataFetch(supabase: any, userId: string, dataType: string, symbols: string[], success: boolean): Promise<void> {
  try {
    await supabase
      .from('bot_activities')
      .insert({
        user_id: userId,
        bot_id: 'system',
        activity_type: 'data_fetch',
        title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data Fetch`,
        description: `${success ? 'Successfully' : 'Failed to'} fetch ${dataType} data for ${symbols.join(', ')}`,
        status: success ? 'success' : 'error',
        data: {
          dataType,
          symbols,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error logging data fetch:', error);
  }
}