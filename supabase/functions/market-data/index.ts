import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketDataResponse {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high: number;
  low: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching market data from Binance API...');
    
    // Get popular crypto symbols
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT'];
    
    // Fetch data from Binance API
    const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr`;
    const response = await fetch(binanceUrl);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const allData = await response.json();
    
    // Filter for our selected symbols
    const filteredData = allData
      .filter((item: any) => symbols.includes(item.symbol))
      .map((item: any): MarketDataResponse => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChange: parseFloat(item.priceChange),
        priceChangePercent: parseFloat(item.priceChangePercent),
        volume: parseFloat(item.volume),
        high: parseFloat(item.highPrice),
        low: parseFloat(item.lowPrice)
      }));

    console.log(`Successfully fetched data for ${filteredData.length} symbols`);

    // Store in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert market data
    const marketDataInserts = filteredData.map(data => ({
      symbol: data.symbol,
      price: data.price,
      change_24h: data.priceChange,
      change_percent_24h: data.priceChangePercent,
      volume_24h: data.volume,
      high_24h: data.high,
      low_24h: data.low
    }));

    const { error: insertError } = await supabase
      .from('market_data')
      .insert(marketDataInserts);

    if (insertError) {
      console.error('Error inserting market data:', insertError);
      throw insertError;
    }

    console.log('Market data successfully stored in database');

    return new Response(JSON.stringify({ 
      success: true, 
      data: filteredData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in market-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});