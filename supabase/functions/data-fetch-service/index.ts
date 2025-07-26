import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataFetchRequest {
  action: 'fetch_market_data' | 'fetch_all_data' | 'test_connection';
  symbols?: string[];
  force?: boolean; // Skip cache
}

// Default watchlist symbols
const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Data fetch service called...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for internal operations
    );

    const { action = 'fetch_all_data', symbols = DEFAULT_SYMBOLS, force = false }: DataFetchRequest = 
      req.method === 'POST' ? await req.json() : { action: 'fetch_all_data' };

    console.log(`Action: ${action}, Symbols: ${symbols.join(', ')}, Force: ${force}`);

    let result;
    switch (action) {
      case 'test_connection':
        result = await testConnections();
        break;
      case 'fetch_market_data':
        result = await fetchAndStoreMarketData(supabase, symbols);
        break;
      case 'fetch_all_data':
        result = await fetchAllData(supabase, symbols);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in data fetch service:', error);
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

async function testConnections() {
  console.log('Testing connections...');
  
  const results = {
    binance: false,
    supabase: false,
    googleAI: false
  };

  // Test Binance API
  try {
    const response = await fetch('https://api.binance.com/api/v3/ping');
    results.binance = response.ok;
    console.log(`Binance API: ${results.binance ? 'OK' : 'FAILED'}`);
  } catch (error) {
    console.error('Binance test failed:', error);
  }

  // Test Supabase
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { error } = await supabase.from('market_data').select('id').limit(1);
    results.supabase = !error;
    console.log(`Supabase: ${results.supabase ? 'OK' : 'FAILED'}`);
  } catch (error) {
    console.error('Supabase test failed:', error);
  }

  // Test Google AI
  try {
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    results.googleAI = !!googleApiKey;
    console.log(`Google AI: ${results.googleAI ? 'OK (key present)' : 'FAILED (no key)'}`);
  } catch (error) {
    console.error('Google AI test failed:', error);
  }

  return results;
}

async function fetchAndStoreMarketData(supabase: any, symbols: string[]) {
  console.log(`Fetching market data for: ${symbols.join(', ')}`);
  
  const results = {
    successful: [],
    failed: [],
    stored: 0
  };

  try {
    // Fetch market data from Binance
    const fetchPromises = symbols.map(async (symbol) => {
      try {
        console.log(`Fetching data for ${symbol}...`);
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const ticker = await response.json();
        
        const marketData = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change_24h: parseFloat(ticker.priceChange),
          change_percent_24h: parseFloat(ticker.priceChangePercent),
          volume_24h: parseFloat(ticker.volume),
          high_24h: parseFloat(ticker.highPrice),
          low_24h: parseFloat(ticker.lowPrice),
          timestamp: new Date().toISOString()
        };

        results.successful.push(marketData);
        console.log(`✅ ${symbol}: $${marketData.price} (${marketData.change_percent_24h.toFixed(2)}%)`);
        
        return marketData;
      } catch (error) {
        console.error(`❌ ${symbol}: ${error.message}`);
        results.failed.push({ symbol, error: error.message });
        return null;
      }
    });

    const marketDataResults = await Promise.all(fetchPromises);
    const validData = marketDataResults.filter(data => data !== null);

    // Store in database if we have valid data
    if (validData.length > 0) {
      console.log(`Storing ${validData.length} market data records...`);
      
      const { error: insertError } = await supabase
        .from('market_data')
        .upsert(validData, {
          onConflict: 'symbol'
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      results.stored = validData.length;
      console.log(`✅ Stored ${validData.length} records in database`);
    }

    return results;
  } catch (error) {
    console.error('Error in fetchAndStoreMarketData:', error);
    throw error;
  }
}

async function generateMarketSentiment(symbols: string[], marketData: any[]) {
  try {
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      console.log('Google AI API key not configured - skipping sentiment analysis');
      return { success: false, reason: 'No API key' };
    }

    if (marketData.length === 0) {
      return { success: false, reason: 'No market data available' };
    }

    const priceChanges = marketData.map(data => 
      `${data.symbol}: ${data.change_percent_24h.toFixed(2)}%`
    ).join(', ');

    const prompt = `Analyze market sentiment for these cryptocurrencies: ${priceChanges}

Provide a brief analysis (2-3 sentences) covering:
- Overall market direction (bullish/bearish/neutral)  
- Key observations
- Risk assessment

Be concise and objective.`;

    console.log('Generating sentiment analysis with Google AI...');

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
          maxOutputTokens: 300,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const result = await response.json();
    const sentimentText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!sentimentText) {
      throw new Error('No sentiment analysis returned');
    }

    console.log('✅ Sentiment analysis generated');

    return {
      success: true,
      analysis: sentimentText.trim(),
      timestamp: new Date().toISOString(),
      symbols: symbols,
      marketSummary: priceChanges
    };

  } catch (error) {
    console.error('Error generating sentiment:', error);
    return { 
      success: false, 
      reason: error.message,
      fallback: 'Market sentiment analysis unavailable due to technical issues'
    };
  }
}

async function fetchAllData(supabase: any, symbols: string[]) {
  console.log('Fetching all data types...');
  
  const results = {
    marketData: null,
    sentiment: null,
    summary: {
      totalSymbols: symbols.length,
      successfulFetches: 0,
      errors: []
    }
  };

  try {
    // 1. Fetch and store market data
    console.log('Step 1: Fetching market data...');
    results.marketData = await fetchAndStoreMarketData(supabase, symbols);
    results.summary.successfulFetches = results.marketData.successful.length;
    
    if (results.marketData.failed.length > 0) {
      results.summary.errors.push(`Failed to fetch data for: ${results.marketData.failed.map(f => f.symbol).join(', ')}`);
    }

    // 2. Generate sentiment analysis
    console.log('Step 2: Generating sentiment analysis...');
    results.sentiment = await generateMarketSentiment(symbols, results.marketData.successful);
    
    if (!results.sentiment.success) {
      results.summary.errors.push(`Sentiment analysis failed: ${results.sentiment.reason}`);
    }

    // 3. Log overall success
    const successRate = (results.summary.successfulFetches / results.summary.totalSymbols) * 100;
    console.log(`✅ Data fetch completed: ${successRate.toFixed(1)}% success rate`);

    return results;

  } catch (error) {
    console.error('Error in fetchAllData:', error);
    results.summary.errors.push(`Critical error: ${error.message}`);
    throw error;
  }
}