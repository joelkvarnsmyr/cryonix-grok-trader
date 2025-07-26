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
    const { botId, symbol, marketData, riskSettings } = await req.json();
    
    console.log('🧠 Market Analysis AI called for:', { botId, symbol });
    
    // Mock portfolio data - assume we have $1000 available
    const mockPortfolioData = {
      availableCash: 1000.00,
      totalValue: 1000.00,
      positionCount: 0,
      holdings: [],
      currentPosition: null,
      totalPortfolioValue: 1000.00
    };

    // Simple decision logic based on market data
    let decision = 'hold';
    let confidence = 50;
    let reasoning = 'Default hold position.';
    let suggestedQuantity = 0;

    // Basic trading logic
    const priceChange = marketData.change_percent_24h || 0;
    const price = marketData.price || 0;
    
    if (mockPortfolioData.availableCash > 100) {
      if (priceChange > 1) {
        decision = 'buy';
        confidence = 65 + Math.random() * 20; // 65-85% confidence
        suggestedQuantity = Math.min(50, mockPortfolioData.availableCash * 0.05); // 5% of available cash, max $50
        reasoning = `Positive price momentum (+${priceChange.toFixed(2)}%) suggests buying opportunity. Available cash: $${mockPortfolioData.availableCash}. Recommended position: $${suggestedQuantity}.`;
      } else if (priceChange < -2) {
        decision = 'buy';
        confidence = 70 + Math.random() * 15; // 70-85% confidence  
        suggestedQuantity = Math.min(75, mockPortfolioData.availableCash * 0.075); // 7.5% of available cash for dip buying
        reasoning = `Price dip (${priceChange.toFixed(2)}%) presents buying opportunity. Dollar-cost averaging strategy with $${suggestedQuantity} position.`;
      } else {
        decision = 'hold';
        confidence = 55 + Math.random() * 10; // 55-65% confidence
        suggestedQuantity = 0;
        reasoning = `Neutral market conditions (${priceChange.toFixed(2)}% change). Maintaining current positions and cash reserves of $${mockPortfolioData.availableCash}.`;
      }
    }

    const analysis = {
      decision,
      confidence: Math.round(confidence),
      reasoning,
      suggestedQuantity: Math.round(suggestedQuantity),
      question: `Portfolio: $${mockPortfolioData.availableCash} available. Should we ${decision} ${symbol}? Price: $${price.toFixed(2)}, 24h change: ${priceChange.toFixed(2)}%`,
      aiResponse: `Mock AI analysis: ${decision.toUpperCase()} recommendation`,
      portfolioContext: {
        availableCash: mockPortfolioData.availableCash,
        totalValue: mockPortfolioData.totalValue,
        positionCount: mockPortfolioData.positionCount
      }
    };

    console.log('✅ AI Analysis completed:', { decision, confidence, suggestedQuantity });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in market-analysis-ai:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});