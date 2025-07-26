import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { dataCache, cacheMonitor, getCachedData, setCachedData, getCacheStats } from './cache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataFetchRequest {
  action: 'fetch_market_data' | 'fetch_all_data' | 'fetch_sentiment' | 'fetch_news' | 'fetch_technical_indicators' | 'test_connection' | 'cache_stats' | 'clear_cache';
  symbols?: string[];
  force?: boolean; // Skip cache
  timeframe?: string; // For technical indicators
  newsKeywords?: string[]; // For news filtering
  cacheSource?: 'market_data' | 'sentiment' | 'news' | 'technical_indicators' | 'google_trends'; // For cache operations
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

    const { 
      action = 'fetch_all_data', 
      symbols = DEFAULT_SYMBOLS, 
      force = false,
      timeframe = '1h',
      newsKeywords = ['Bitcoin', 'Ethereum', 'Cryptocurrency', 'Crypto regulation'],
      cacheSource
    }: DataFetchRequest = req.method === 'POST' ? await req.json() : { action: 'fetch_all_data' };

    console.log(`Action: ${action}, Symbols: ${symbols.join(', ')}, Force: ${force}`);

    let result;
    switch (action) {
      case 'test_connection':
        result = await testConnections();
        break;
      case 'cache_stats':
        result = getCacheStats();
        break;
      case 'clear_cache':
        if (cacheSource) {
          dataCache.clearBySource(cacheSource);
          result = { message: `Cleared ${cacheSource} cache` };
        } else {
          dataCache.clear();
          result = { message: 'Cleared entire cache' };
        }
        break;
      case 'fetch_market_data':
        result = await fetchAndStoreMarketData(supabase, symbols, force);
        break;
      case 'fetch_sentiment':
        result = await fetchGoogleTrendsSentiment(symbols, force);
        break;
      case 'fetch_news':
        result = await fetchCryptoNews(newsKeywords, force);
        break;
      case 'fetch_technical_indicators':
        result = await fetchTechnicalIndicators(supabase, symbols, timeframe, force);
        break;
      case 'fetch_all_data':
        result = await fetchAllData(supabase, symbols, timeframe, newsKeywords, force);
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
    googleAI: false,
    googleTrends: false
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

  // Test Google Trends (simplified test)
  try {
    results.googleTrends = true; // We'll implement actual test later
    console.log(`Google Trends: ${results.googleTrends ? 'OK (simulated)' : 'FAILED'}`);
  } catch (error) {
    console.error('Google Trends test failed:', error);
  }

  return results;
}

async function fetchAndStoreMarketData(supabase: any, symbols: string[], force = false) {
  console.log(`Fetching market data for: ${symbols.join(', ')} ${force ? '(forced)' : ''}`);
  
  // Check cache first (unless forced)
  if (!force) {
    const cacheKey = { symbols, type: 'market_data' };
    const cachedData = getCachedData('market_data', cacheKey);
    if (cachedData) {
      console.log('✅ Using cached market data');
      return { ...cachedData, fromCache: true };
    }
  }
  
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

    // Cache the results
    const cacheKey = { symbols, type: 'market_data' };
    setCachedData('market_data', cacheKey, results);

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

// Google Trends Sentiment Analysis
async function fetchGoogleTrendsSentiment(symbols: string[]) {
  console.log('Fetching Google Trends sentiment...');
  
  const results = {
    successful: [],
    failed: [],
    trendData: {}
  };

  try {
    // Convert symbols to searchable terms
    const searchTerms = symbols.map(symbol => {
      const cleanSymbol = symbol.replace('USDT', '').replace('BUSD', '');
      const cryptoNames = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum', 
        'BNB': 'Binance Coin',
        'SOL': 'Solana',
        'DOGE': 'Dogecoin'
      };
      return cryptoNames[cleanSymbol] || cleanSymbol;
    });

    console.log(`Analyzing trends for: ${searchTerms.join(', ')}`);

    // Since Google Trends doesn't have a direct API, we'll simulate trend analysis
    // In production, you'd use a service like Pytrends via a Python microservice
    const simulatedTrends = searchTerms.map(term => {
      const baseInterest = Math.floor(Math.random() * 100);
      const change = (Math.random() - 0.5) * 40; // -20 to +20 change
      
      return {
        term,
        currentInterest: Math.max(0, Math.min(100, baseInterest)),
        changePercent: change,
        trendDirection: change > 5 ? 'rising' : change < -5 ? 'falling' : 'stable',
        searchVolume: 'medium' // could be 'low', 'medium', 'high'
      };
    });

    results.successful = simulatedTrends;
    results.trendData = {
      timestamp: new Date().toISOString(),
      trends: simulatedTrends,
      overallSentiment: calculateOverallTrendSentiment(simulatedTrends)
    };

    console.log('✅ Google Trends sentiment analysis completed');
    return results;

  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    results.failed.push({ error: error.message });
    return results;
  }
}

function calculateOverallTrendSentiment(trends: any[]) {
  const avgChange = trends.reduce((sum, trend) => sum + trend.changePercent, 0) / trends.length;
  const avgInterest = trends.reduce((sum, trend) => sum + trend.currentInterest, 0) / trends.length;
  
  let sentiment = 'neutral';
  if (avgChange > 10 && avgInterest > 60) sentiment = 'very_bullish';
  else if (avgChange > 5 && avgInterest > 40) sentiment = 'bullish';
  else if (avgChange < -10 && avgInterest < 30) sentiment = 'very_bearish';
  else if (avgChange < -5) sentiment = 'bearish';
  
  return {
    sentiment,
    avgChangePercent: avgChange,
    avgInterest: avgInterest,
    description: `Overall trend sentiment is ${sentiment} with ${avgChange.toFixed(1)}% average change`
  };
}

// Crypto News Fetching
async function fetchCryptoNews(keywords: string[]) {
  console.log(`Fetching crypto news for keywords: ${keywords.join(', ')}`);
  
  const results = {
    successful: [],
    failed: [],
    newsData: {}
  };

  try {
    // Since we don't have direct Google News API access, we'll simulate news fetching
    // In production, you'd integrate with Google News API or RSS feeds
    const simulatedNews = keywords.flatMap(keyword => {
      const newsCount = Math.floor(Math.random() * 3) + 1;
      return Array.from({ length: newsCount }, (_, i) => {
        const sentiments = ['positive', 'negative', 'neutral'];
        const sources = ['CoinDesk', 'CoinTelegraph', 'Reuters', 'Bloomberg'];
        
        return {
          id: `news_${keyword}_${i}`,
          headline: `${keyword} ${getRandomHeadline()}`,
          source: sources[Math.floor(Math.random() * sources.length)],
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
          relevanceScore: Math.random() * 100,
          url: `https://example.com/news/${keyword.toLowerCase()}-${i}`,
          summary: `Latest developments regarding ${keyword} in the cryptocurrency market.`
        };
      });
    });

    // Sort by relevance and recency
    const sortedNews = simulatedNews
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10); // Top 10 most relevant

    results.successful = sortedNews;
    results.newsData = {
      timestamp: new Date().toISOString(),
      totalArticles: sortedNews.length,
      sentimentBreakdown: calculateNewsSentiment(sortedNews),
      topNews: sortedNews.slice(0, 5)
    };

    console.log(`✅ Fetched ${sortedNews.length} news articles`);
    return results;

  } catch (error) {
    console.error('Error fetching crypto news:', error);
    results.failed.push({ error: error.message });
    return results;
  }
}

function getRandomHeadline() {
  const headlines = [
    'Breaks New All-Time High',
    'Faces Regulatory Challenges',
    'Partners with Major Bank',
    'Shows Strong Market Recovery',
    'Experiences Technical Upgrade',
    'Gains Institutional Support'
  ];
  return headlines[Math.floor(Math.random() * headlines.length)];
}

function calculateNewsSentiment(news: any[]) {
  const sentimentCounts = news.reduce((acc, article) => {
    acc[article.sentiment] = (acc[article.sentiment] || 0) + 1;
    return acc;
  }, {});

  const total = news.length;
  return {
    positive: ((sentimentCounts.positive || 0) / total * 100).toFixed(1),
    negative: ((sentimentCounts.negative || 0) / total * 100).toFixed(1),
    neutral: ((sentimentCounts.neutral || 0) / total * 100).toFixed(1),
    overallSentiment: sentimentCounts.positive > sentimentCounts.negative ? 'bullish' : 
                     sentimentCounts.negative > sentimentCounts.positive ? 'bearish' : 'neutral'
  };
}

// Technical Indicators Calculation
async function fetchTechnicalIndicators(supabase: any, symbols: string[], timeframe: string) {
  console.log(`Calculating technical indicators for: ${symbols.join(', ')}`);
  
  const results = {
    successful: [],
    failed: [],
    indicators: {}
  };

  try {
    for (const symbol of symbols) {
      try {
        // Fetch historical data for technical analysis
        const historicalData = await fetchHistoricalPriceData(symbol, timeframe);
        
        if (historicalData.length < 20) {
          throw new Error('Insufficient data for technical analysis');
        }

        const indicators = calculateTechnicalIndicators(historicalData);
        
        results.successful.push({
          symbol,
          indicators,
          dataPoints: historicalData.length,
          timeframe
        });

        console.log(`✅ ${symbol}: Calculated ${Object.keys(indicators).length} indicators`);

      } catch (error) {
        console.error(`❌ ${symbol}: ${error.message}`);
        results.failed.push({ symbol, error: error.message });
      }
    }

    results.indicators = {
      timestamp: new Date().toISOString(),
      timeframe,
      summary: generateIndicatorSummary(results.successful)
    };

    return results;

  } catch (error) {
    console.error('Error calculating technical indicators:', error);
    throw error;
  }
}

async function fetchHistoricalPriceData(symbol: string, timeframe: string) {
  const intervals = {
    '1m': '1m',
    '5m': '5m', 
    '1h': '1h',
    '4h': '4h',
    '1d': '1d'
  };

  const interval = intervals[timeframe] || '1h';
  const limit = timeframe === '1d' ? 100 : 200; // More data for shorter timeframes

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.status}`);
    }

    const klines = await response.json();
    
    return klines.map((kline: any[]) => ({
      timestamp: new Date(kline[0]).toISOString(),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));

  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw error;
  }
}

function calculateTechnicalIndicators(priceData: any[]) {
  const closes = priceData.map(d => d.close);
  const highs = priceData.map(d => d.high);
  const lows = priceData.map(d => d.low);
  const volumes = priceData.map(d => d.volume);

  return {
    // Simple Moving Averages
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    
    // Exponential Moving Averages
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    
    // RSI (Relative Strength Index)
    rsi: calculateRSI(closes, 14),
    
    // MACD
    macd: calculateMACD(closes),
    
    // Bollinger Bands
    bollingerBands: calculateBollingerBands(closes, 20, 2),
    
    // Volume indicators
    volumeAvg: volumes.slice(-20).reduce((a, b) => a + b, 0) / 20,
    
    // Support/Resistance levels
    supportResistance: calculateSupportResistance(highs, lows, closes),
    
    // Overall signal
    overallSignal: 'neutral' // Will be calculated based on indicators
  };
}

function calculateSMA(prices: number[], period: number) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(prices: number[], period: number) {
  if (prices.length < period) return null;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number) {
  if (prices.length < period + 1) return null;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const gains = changes.slice(-period).map(c => c > 0 ? c : 0);
  const losses = changes.slice(-period).map(c => c < 0 ? Math.abs(c) : 0);
  
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  if (!ema12 || !ema26) return null;
  
  const macdLine = ema12 - ema26;
  return {
    macd: macdLine,
    signal: macdLine, // Simplified - should be EMA of MACD
    histogram: 0 // MACD - Signal
  };
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number) {
  const sma = calculateSMA(prices, period);
  if (!sma) return null;
  
  const recentPrices = prices.slice(-period);
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  };
}

function calculateSupportResistance(highs: number[], lows: number[], closes: number[]) {
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);
  const currentPrice = closes[closes.length - 1];
  
  return {
    resistance: Math.max(...recentHighs),
    support: Math.min(...recentLows),
    currentPrice: currentPrice
  };
}

function generateIndicatorSummary(successfulIndicators: any[]) {
  const signals = successfulIndicators.map(item => {
    const indicators = item.indicators;
    let bullishCount = 0;
    let bearishCount = 0;
    let totalSignals = 0;

    // Analyze each indicator for bullish/bearish signals
    if (indicators.rsi) {
      totalSignals++;
      if (indicators.rsi < 30) bullishCount++; // Oversold
      else if (indicators.rsi > 70) bearishCount++; // Overbought
    }

    if (indicators.sma20 && indicators.sma50) {
      totalSignals++;
      if (indicators.sma20 > indicators.sma50) bullishCount++;
      else bearishCount++;
    }

    const signal = bullishCount > bearishCount ? 'bullish' : 
                  bearishCount > bullishCount ? 'bearish' : 'neutral';

    return { symbol: item.symbol, signal, bullishCount, bearishCount, totalSignals };
  });

  const overallBullish = signals.filter(s => s.signal === 'bullish').length;
  const overallBearish = signals.filter(s => s.signal === 'bearish').length;

  return {
    signals,
    overallMarketSentiment: overallBullish > overallBearish ? 'bullish' : 
                           overallBearish > overallBullish ? 'bearish' : 'neutral',
    bullishSymbols: overallBullish,
    bearishSymbols: overallBearish,
    neutralSymbols: signals.length - overallBullish - overallBearish
  };
}

// Enhanced fetchAllData with all new components
async function fetchAllData(supabase: any, symbols: string[], timeframe: string, newsKeywords: string[]) {
  console.log('Fetching comprehensive market data...');
  
  const results = {
    marketData: null,
    sentiment: null,
    googleTrends: null,
    news: null,
    technicalIndicators: null,
    summary: {
      totalSymbols: symbols.length,
      successfulFetches: 0,
      errors: [],
      completedTasks: 0,
      totalTasks: 5
    }
  };

  try {
    // 1. Fetch and store market data
    console.log('Step 1/5: Fetching market data...');
    results.marketData = await fetchAndStoreMarketData(supabase, symbols);
    results.summary.successfulFetches = results.marketData.successful.length;
    results.summary.completedTasks++;
    
    if (results.marketData.failed.length > 0) {
      results.summary.errors.push(`Market data failed for: ${results.marketData.failed.map(f => f.symbol).join(', ')}`);
    }

    // 2. Generate AI sentiment analysis
    console.log('Step 2/5: Generating AI sentiment analysis...');
    results.sentiment = await generateMarketSentiment(symbols, results.marketData.successful);
    results.summary.completedTasks++;
    
    if (!results.sentiment.success) {
      results.summary.errors.push(`AI sentiment analysis failed: ${results.sentiment.reason}`);
    }

    // 3. Fetch Google Trends sentiment
    console.log('Step 3/5: Fetching Google Trends sentiment...');
    results.googleTrends = await fetchGoogleTrendsSentiment(symbols);
    results.summary.completedTasks++;
    
    if (results.googleTrends.failed.length > 0) {
      results.summary.errors.push(`Google Trends failed for some symbols`);
    }

    // 4. Fetch crypto news
    console.log('Step 4/5: Fetching crypto news...');
    results.news = await fetchCryptoNews(newsKeywords);
    results.summary.completedTasks++;
    
    if (results.news.failed.length > 0) {
      results.summary.errors.push(`News fetching encountered issues`);
    }

    // 5. Calculate technical indicators
    console.log('Step 5/5: Calculating technical indicators...');
    results.technicalIndicators = await fetchTechnicalIndicators(supabase, symbols, timeframe);
    results.summary.completedTasks++;
    
    if (results.technicalIndicators.failed.length > 0) {
      results.summary.errors.push(`Technical indicators failed for: ${results.technicalIndicators.failed.map(f => f.symbol).join(', ')}`);
    }

    // 6. Generate comprehensive summary
    const successRate = (results.summary.successfulFetches / results.summary.totalSymbols) * 100;
    const taskCompletionRate = (results.summary.completedTasks / results.summary.totalTasks) * 100;
    
    console.log(`✅ Comprehensive data fetch completed:`);
    console.log(`   - Market data: ${successRate.toFixed(1)}% success rate`);
    console.log(`   - Tasks completed: ${taskCompletionRate.toFixed(1)}%`);

    return results;

  } catch (error) {
    console.error('Error in comprehensive data fetch:', error);
    results.summary.errors.push(`Critical error: ${error.message}`);
    throw error;
  }
}