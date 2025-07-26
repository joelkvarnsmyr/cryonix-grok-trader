import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols = ['BTCUSDT'], timeframe = '1m', newsKeywords = ['bitcoin', 'crypto'] } = await req.json();
    
    console.log('🔄 Data fetch service called with:', { symbols, timeframe, newsKeywords });

    // Simulate market data fetch (TESTNET safe)
    const mockMarketData = symbols.map(symbol => ({
      symbol,
      price: Math.random() * 100000 + 50000, // Random price between 50k-150k
      change_percent_24h: (Math.random() - 0.5) * 10, // Random change -5% to +5%
      volume_24h: Math.random() * 1000000000 + 100000000, // Random volume
      market_cap: Math.random() * 2000000000000 + 500000000000, // Random market cap
      timestamp: new Date().toISOString()
    }));

    // Simulate sentiment data
    const mockSentiment = {
      success: true,
      symbols: symbols.map(symbol => ({
        symbol,
        sentiment_score: Math.random() * 100, // 0-100 sentiment
        sentiment_label: Math.random() > 0.5 ? 'Bullish' : 'Bearish',
        social_media_buzz: Math.random() > 0.7 ? 'high' : 'medium',
        key_factors: ['Market momentum', 'Technical analysis', 'News sentiment']
      })),
      reason: 'AI sentiment analysis completed'
    };

    // Simulate Google Trends data
    const mockGoogleTrends = {
      successful: symbols.map(symbol => ({
        symbol,
        trend_score: Math.random() * 100,
        search_volume: Math.random() > 0.5 ? 'increasing' : 'stable',
        region: 'global'
      })),
      failed: []
    };

    // Simulate news data
    const mockNews = {
      successful: [
        {
          title: `${symbols[0]} shows positive momentum in crypto markets`,
          description: 'Technical analysis suggests bullish patterns forming',
          source: 'CryptoNews',
          timestamp: new Date().toISOString(),
          sentiment: 'positive'
        },
        {
          title: 'Market volatility presents trading opportunities',
          description: 'Traders remain cautious amid market uncertainty',
          source: 'CoinDesk',
          timestamp: new Date().toISOString(),
          sentiment: 'neutral'
        }
      ],
      failed: []
    };

    // Simulate technical indicators
    const mockTechnicalIndicators = {
      successful: symbols.map(symbol => ({
        symbol,
        sma20: Math.random() * 100000 + 50000,
        sma50: Math.random() * 100000 + 45000,
        rsi: Math.random() * 100,
        macd: {
          signal: Math.random() > 0.5 ? 'bullish' : 'bearish',
          histogram: Math.random() - 0.5
        },
        bollinger_bands: {
          upper: Math.random() * 110000 + 55000,
          middle: Math.random() * 100000 + 50000,
          lower: Math.random() * 90000 + 45000
        },
        support_resistance: {
          support: Math.random() * 90000 + 40000,
          resistance: Math.random() * 110000 + 60000
        }
      })),
      failed: []
    };

    const results = {
      marketData: {
        successful: mockMarketData,
        failed: []
      },
      sentiment: mockSentiment,
      googleTrends: mockGoogleTrends,
      news: mockNews,
      technicalIndicators: mockTechnicalIndicators,
      summary: {
        totalSymbols: symbols.length,
        successfulFetches: symbols.length,
        errors: [],
        completedTasks: 5,
        totalTasks: 5,
        timestamp: new Date().toISOString(),
        environment: 'TESTNET_SIMULATION'
      }
    };

    console.log('✅ Mock data generated successfully');
    
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in data-fetch-service:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});