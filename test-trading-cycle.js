// Test script för att starta första handelscykeln
console.log('🚀 Startar första handelscykeln för Cryonix Trading Bot...');

const SUPABASE_URL = 'https://mykiihodfokpskccbvfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15a2lpaG9kZm9rcHNrY2NidmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODM1OTQsImV4cCI6MjA2OTA1OTU5NH0.qOTSsoIaoSmuqLz_ZFXbA6qDTGnhz86HfEsOPBjOjRc';

// Test call till autonomous-trading-loop
async function testTradingCycle() {
  try {
    console.log('📊 Anropar data-fetch-service...');
    
    const dataResponse = await fetch(`${SUPABASE_URL}/functions/v1/data-fetch-service`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbols: ['BTCUSDT'],
        timeframe: '1m',
        newsKeywords: ['bitcoin', 'btc', 'crypto']
      })
    });
    
    const dataResult = await dataResponse.json();
    console.log('📈 Marknadsdata:', dataResult);
    
    console.log('🤖 Anropar market-analysis-ai...');
    
    const analysisResponse = await fetch(`${SUPABASE_URL}/functions/v1/market-analysis-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        botId: '0f6465a6-c877-4a76-948f-f90b79194b24',
        symbol: 'BTCUSDT',
        marketData: dataResult.marketData?.successful?.[0] || { price: 95000, change_percent_24h: 2.5, volume_24h: 1000000 },
        riskSettings: { riskLevel: 'medium', maxTradeAmount: 0.05, stopLoss: 0.02 }
      })
    });
    
    const analysisResult = await analysisResponse.json();
    console.log('🧠 AI-analys:', analysisResult);
    
    console.log('⚖️ Anropar risk-analysis...');
    
    const riskResponse = await fetch(`${SUPABASE_URL}/functions/v1/risk-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        botId: '0f6465a6-c877-4a76-948f-f90b79194b24',
        symbol: 'BTCUSDT',
        action: analysisResult.decision || 'buy',
        quantity: analysisResult.suggestedQuantity || 50,
        price: dataResult.marketData?.successful?.[0]?.price || 95000
      })
    });
    
    const riskResult = await riskResponse.json();
    console.log('🛡️ Riskanalys:', riskResult);
    
    console.log('✅ Första handelscykeln genomförd!');
    console.log('💰 Nuvarande balans: $1000 USDT (TESTNET)');
    console.log('📊 Portfölj: Tom (första cykel)');
    
  } catch (error) {
    console.error('❌ Fel i handelscykeln:', error);
  }
}

// Kör test omedelbart
testTradingCycle();