import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskAnalysisRequest {
  botId: string;
  symbol: string;
  proposedTrade: {
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    confidence: number;
  };
  marketData: any;
  analysisResult?: any;
}

interface RiskMetrics {
  portfolioRisk: number;
  concentrationRisk: number;
  volatilityRisk: number;
  liquidityRisk: number;
  drawdownRisk: number;
  correlationRisk: number;
  overallRiskScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const requestData: RiskAnalysisRequest = await req.json();

    // Perform comprehensive risk analysis
    const riskAnalysis = await performRiskAnalysis(supabase, user.id, requestData);

    return new Response(JSON.stringify(riskAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in risk analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performRiskAnalysis(supabase: any, userId: string, request: RiskAnalysisRequest) {
  console.log(`Performing risk analysis for bot ${request.botId}`);

  // 1. Get bot and portfolio data
  const { data: bot } = await supabase
    .from('trading_bots')
    .select('*')
    .eq('id', request.botId)
    .eq('user_id', userId)
    .single();

  if (!bot) {
    throw new Error('Bot not found');
  }

  // 2. Get recent trades for pattern analysis
  const { data: recentTrades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('bot_id', request.botId)
    .order('created_at', { ascending: false })
    .limit(50);

  // 3. Get current market volatility
  const { data: marketHistory } = await supabase
    .from('market_data')
    .select('*')
    .eq('symbol', request.symbol)
    .order('timestamp', { ascending: false })
    .limit(24); // Last 24 hours

  // 4. Calculate comprehensive risk metrics
  const riskMetrics = await calculateRiskMetrics(
    bot, 
    recentTrades || [], 
    marketHistory || [], 
    request
  );

  // 5. Apply risk rules and generate recommendation
  const riskAssessment = await assessTradeRisk(riskMetrics, bot, request);

  // 6. Calculate position sizing recommendations
  const positionSizing = calculateOptimalPositionSize(riskMetrics, bot, request);

  // 7. Generate risk report
  const riskReport = generateRiskReport(riskMetrics, riskAssessment, positionSizing);

  return {
    approved: riskAssessment.approved,
    riskScore: riskMetrics.overallRiskScore,
    recommendedQuantity: positionSizing.recommendedQuantity,
    maxQuantity: positionSizing.maxQuantity,
    reason: riskAssessment.reason,
    warnings: riskAssessment.warnings,
    metrics: riskMetrics,
    report: riskReport,
    timestamp: new Date().toISOString()
  };
}

async function calculateRiskMetrics(
  bot: any, 
  recentTrades: any[], 
  marketHistory: any[], 
  request: RiskAnalysisRequest
): Promise<RiskMetrics> {
  
  // 1. Portfolio Risk - based on current balance vs initial
  const portfolioRisk = calculatePortfolioRisk(bot);
  
  // 2. Concentration Risk - how much of portfolio this trade represents
  const concentrationRisk = calculateConcentrationRisk(bot, request.proposedTrade);
  
  // 3. Volatility Risk - based on recent market movements
  const volatilityRisk = calculateVolatilityRisk(marketHistory);
  
  // 4. Liquidity Risk - based on trading volume
  const liquidityRisk = calculateLiquidityRisk(request.marketData);
  
  // 5. Drawdown Risk - based on recent performance
  const drawdownRisk = calculateDrawdownRisk(recentTrades, bot);
  
  // 6. Correlation Risk - if trading multiple assets
  const correlationRisk = await calculateCorrelationRisk(bot, request.symbol);
  
  // 7. Overall Risk Score (weighted average)
  const overallRiskScore = calculateOverallRiskScore({
    portfolioRisk,
    concentrationRisk,
    volatilityRisk,
    liquidityRisk,
    drawdownRisk,
    correlationRisk
  });

  return {
    portfolioRisk,
    concentrationRisk,
    volatilityRisk,
    liquidityRisk,
    drawdownRisk,
    correlationRisk,
    overallRiskScore
  };
}

function calculatePortfolioRisk(bot: any): number {
  const currentBalance = bot.current_balance;
  const initialBalance = bot.initial_balance;
  
  if (currentBalance <= 0) return 100; // Maximum risk if no balance
  
  const drawdown = (initialBalance - currentBalance) / initialBalance;
  
  // Risk increases exponentially with drawdown
  if (drawdown <= 0) return 0; // No risk if profitable
  if (drawdown >= 0.5) return 100; // Maximum risk at 50% drawdown
  
  return Math.min(100, drawdown * 200); // 0-100 scale
}

function calculateConcentrationRisk(bot: any, proposedTrade: any): number {
  const tradeValue = proposedTrade.quantity * proposedTrade.price;
  const portfolioValue = bot.current_balance;
  
  const concentration = tradeValue / portfolioValue;
  
  // Risk increases exponentially with concentration
  if (concentration <= 0.02) return 0; // Low risk under 2%
  if (concentration >= 0.1) return 100; // Maximum risk at 10%
  
  return Math.min(100, (concentration - 0.02) * 1250); // 0-100 scale
}

function calculateVolatilityRisk(marketHistory: any[]): number {
  if (marketHistory.length < 2) return 50; // Default medium risk
  
  const prices = marketHistory.map(m => parseFloat(m.price));
  const returns = [];
  
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  // Calculate standard deviation of returns
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  // Normalize to 0-100 scale (assuming 10% daily volatility is maximum)
  return Math.min(100, volatility * 1000);
}

function calculateLiquidityRisk(marketData: any): number {
  const volume24h = parseFloat(marketData.volume_24h || 0);
  const price = parseFloat(marketData.price || 1);
  const marketCap = volume24h * price;
  
  // Low liquidity risk for high volume markets
  if (marketCap > 1000000000) return 0; // >$1B daily volume
  if (marketCap > 100000000) return 20; // >$100M daily volume
  if (marketCap > 10000000) return 50; // >$10M daily volume
  
  return 80; // High risk for low liquidity
}

function calculateDrawdownRisk(recentTrades: any[], bot: any): number {
  if (recentTrades.length === 0) return 20; // Default low risk for new bots
  
  const recent10Trades = recentTrades.slice(0, 10);
  const losses = recent10Trades.filter(t => parseFloat(t.pnl || 0) < 0);
  const lossRate = losses.length / recent10Trades.length;
  
  // Consecutive losses increase risk
  let consecutiveLosses = 0;
  for (const trade of recent10Trades) {
    if (parseFloat(trade.pnl || 0) < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }
  
  const baseRisk = lossRate * 100;
  const consecutiveRisk = Math.min(50, consecutiveLosses * 15);
  
  return Math.min(100, baseRisk + consecutiveRisk);
}

async function calculateCorrelationRisk(bot: any, currentSymbol: string): number {
  // Simplified correlation risk - would need more sophisticated analysis in production
  // For now, assume moderate risk if trading same symbol repeatedly
  return 30;
}

function calculateOverallRiskScore(risks: Omit<RiskMetrics, 'overallRiskScore'>): number {
  // Weighted average of all risk components
  const weights = {
    portfolioRisk: 0.25,
    concentrationRisk: 0.20,
    volatilityRisk: 0.20,
    liquidityRisk: 0.15,
    drawdownRisk: 0.15,
    correlationRisk: 0.05
  };
  
  return (
    risks.portfolioRisk * weights.portfolioRisk +
    risks.concentrationRisk * weights.concentrationRisk +
    risks.volatilityRisk * weights.volatilityRisk +
    risks.liquidityRisk * weights.liquidityRisk +
    risks.drawdownRisk * weights.drawdownRisk +
    risks.correlationRisk * weights.correlationRisk
  );
}

async function assessTradeRisk(riskMetrics: RiskMetrics, bot: any, request: RiskAnalysisRequest) {
  const warnings = [];
  const riskLevel = bot.risk_settings?.riskLevel || 3;
  
  // Risk thresholds based on user's risk level (1-5)
  const riskThresholds = {
    1: 20, // Very conservative
    2: 35, // Conservative  
    3: 50, // Moderate
    4: 70, // Aggressive
    5: 85  // Very aggressive
  };
  
  const maxAllowedRisk = riskThresholds[riskLevel] || 50;
  
  // Check overall risk score
  if (riskMetrics.overallRiskScore > maxAllowedRisk) {
    return {
      approved: false,
      reason: `Overall risk score (${riskMetrics.overallRiskScore.toFixed(1)}) exceeds maximum allowed (${maxAllowedRisk}) for risk level ${riskLevel}`,
      warnings
    };
  }
  
  // Check individual risk components
  if (riskMetrics.portfolioRisk > 80) {
    warnings.push('High portfolio drawdown detected - consider reducing position sizes');
  }
  
  if (riskMetrics.concentrationRisk > 60) {
    warnings.push('High concentration risk - this trade represents a large portion of portfolio');
  }
  
  if (riskMetrics.volatilityRisk > 70) {
    warnings.push('High market volatility detected - consider smaller position size');
  }
  
  if (riskMetrics.liquidityRisk > 60) {
    warnings.push('Low market liquidity - execution may be difficult');
  }
  
  if (riskMetrics.drawdownRisk > 70) {
    warnings.push('Recent trading performance poor - consider pausing automated trading');
  }
  
  // Check confidence level
  if (request.proposedTrade.confidence < 60) {
    return {
      approved: false,
      reason: `AI confidence too low (${request.proposedTrade.confidence}%) - minimum 60% required`,
      warnings
    };
  }
  
  return {
    approved: true,
    reason: 'Trade approved by risk management system',
    warnings
  };
}

function calculateOptimalPositionSize(riskMetrics: RiskMetrics, bot: any, request: RiskAnalysisRequest) {
  const maxRiskPerTrade = bot.risk_settings?.maxTradeAmount || 0.05; // Default 5%
  const basePosition = bot.current_balance * maxRiskPerTrade;
  
  // Adjust position size based on risk metrics
  let riskAdjustment = 1.0;
  
  // Reduce size for high risk
  if (riskMetrics.overallRiskScore > 60) {
    riskAdjustment *= (100 - riskMetrics.overallRiskScore) / 40; // Scale down significantly
  }
  
  // Reduce size for high volatility
  if (riskMetrics.volatilityRisk > 50) {
    riskAdjustment *= (100 - riskMetrics.volatilityRisk) / 50;
  }
  
  // Reduce size for concentration risk
  if (riskMetrics.concentrationRisk > 40) {
    riskAdjustment *= (100 - riskMetrics.concentrationRisk) / 60;
  }
  
  const recommendedQuantity = Math.max(10, basePosition * riskAdjustment); // Minimum $10
  const maxQuantity = basePosition;
  
  return {
    recommendedQuantity,
    maxQuantity,
    riskAdjustment,
    reasoning: `Position size adjusted by ${(riskAdjustment * 100).toFixed(1)}% based on risk analysis`
  };
}

function generateRiskReport(riskMetrics: RiskMetrics, assessment: any, positioning: any) {
  return {
    summary: `Overall risk score: ${riskMetrics.overallRiskScore.toFixed(1)}/100`,
    riskBreakdown: {
      'Portfolio Risk': `${riskMetrics.portfolioRisk.toFixed(1)}/100 - Based on current drawdown`,
      'Concentration Risk': `${riskMetrics.concentrationRisk.toFixed(1)}/100 - Position size vs portfolio`,
      'Volatility Risk': `${riskMetrics.volatilityRisk.toFixed(1)}/100 - Recent market movements`,
      'Liquidity Risk': `${riskMetrics.liquidityRisk.toFixed(1)}/100 - Market trading volume`,
      'Drawdown Risk': `${riskMetrics.drawdownRisk.toFixed(1)}/100 - Recent trading performance`
    },
    recommendation: assessment.approved ? 'TRADE APPROVED' : 'TRADE REJECTED',
    positionSizing: positioning.reasoning
  };
}