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
    const { botId, symbol, action, quantity, price } = await req.json();
    
    console.log('⚖️ Risk Analysis called for:', { botId, symbol, action, quantity, price });

    // Mock risk analysis based on action and quantity
    let approved = true;
    let riskScore = 0;
    let warnings = [];
    let adjustedQuantity = quantity;

    // Basic risk calculations
    const positionValue = quantity * price / 1000000; // Convert to millions for readability
    const maxPositionSize = 100; // $100 max for test

    if (action === 'buy') {
      if (quantity > maxPositionSize) {
        approved = false;
        riskScore = 85;
        warnings.push(`Position size too large: $${quantity} exceeds maximum $${maxPositionSize}`);
        adjustedQuantity = maxPositionSize;
      } else if (quantity > 50) {
        riskScore = 60;
        warnings.push(`Medium risk: Position size $${quantity} is significant`);
      } else {
        riskScore = 25;
      }
    } else if (action === 'sell') {
      riskScore = 15; // Selling is generally lower risk
    } else {
      riskScore = 5; // Hold is lowest risk
    }

    const analysis = {
      approved,
      riskScore,
      recommendedQuantity: Math.round(adjustedQuantity),
      maxQuantity: maxPositionSize,
      warnings,
      riskMetrics: {
        portfolioRisk: 10,
        concentrationRisk: 5,
        volatilityRisk: riskScore * 0.3,
        liquidityRisk: 2,
        drawdownRisk: 8,
        correlationRisk: 3,
        overallRiskScore: riskScore
      },
      assessment: {
        approved,
        riskLevel: riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high',
        confidence: 100 - riskScore
      },
      positionSizing: {
        recommendedQuantity: Math.round(adjustedQuantity),
        maxQuantity: maxPositionSize,
        adjustmentReason: warnings.length > 0 ? warnings[0] : 'Position size approved'
      },
      report: `Risk Analysis: ${action.toUpperCase()} ${symbol} for $${adjustedQuantity}. Risk Score: ${riskScore}/100. ${approved ? 'APPROVED' : 'REJECTED'}.`,
      timestamp: new Date().toISOString(),
      environment: 'TESTNET'
    };

    console.log('✅ Risk Analysis completed:', { approved, riskScore, recommendedQuantity: adjustedQuantity });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in risk-analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});