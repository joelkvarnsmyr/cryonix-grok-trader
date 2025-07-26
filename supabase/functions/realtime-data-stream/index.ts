import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// WebSocket Real-time Data Stream for Cryonix
// Implements real-time market data streaming according to blueprint

interface ClientConnection {
  socket: WebSocket;
  userId: string;
  subscriptions: Set<string>;
  lastPing: number;
}

interface StreamingData {
  type: 'market_data' | 'sentiment_update' | 'news_alert' | 'technical_signal' | 'risk_alert';
  symbol?: string;
  data: any;
  timestamp: string;
}

const connections = new Map<string, ClientConnection>();
const PING_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 60 seconds

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const apiKey = url.searchParams.get('apiKey');

  if (!userId || !apiKey) {
    return new Response("Missing userId or apiKey", { status: 400 });
  }

  // Verify API key and user
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Verify user exists and is authenticated
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) {
      return new Response("Invalid user", { status: 401 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    const connectionId = `${userId}_${Date.now()}`;

    socket.onopen = () => {
      console.log(`🔌 WebSocket connected: ${connectionId}`);
      
      const connection: ClientConnection = {
        socket,
        userId,
        subscriptions: new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT']), // Default watchlist
        lastPing: Date.now()
      };
      
      connections.set(connectionId, connection);

      // Send welcome message
      sendToClient(connectionId, {
        type: 'system',
        data: {
          status: 'connected',
          message: 'Real-time data stream active',
          subscriptions: Array.from(connection.subscriptions)
        },
        timestamp: new Date().toISOString()
      });

      // Start market data stream for this client
      startMarketDataStream(connectionId);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleClientMessage(connectionId, message);
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    };

    socket.onclose = () => {
      console.log(`🔌 WebSocket disconnected: ${connectionId}`);
      connections.delete(connectionId);
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      connections.delete(connectionId);
    };

    return response;

  } catch (error) {
    console.error('WebSocket setup error:', error);
    return new Response("Internal server error", { status: 500 });
  }
});

function handleClientMessage(connectionId: string, message: any) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  console.log(`📨 Message from ${connectionId}:`, message);

  switch (message.type) {
    case 'subscribe':
      if (Array.isArray(message.symbols)) {
        message.symbols.forEach(symbol => connection.subscriptions.add(symbol));
        sendToClient(connectionId, {
          type: 'subscription_updated',
          data: { subscriptions: Array.from(connection.subscriptions) },
          timestamp: new Date().toISOString()
        });
      }
      break;

    case 'unsubscribe':
      if (Array.isArray(message.symbols)) {
        message.symbols.forEach(symbol => connection.subscriptions.delete(symbol));
        sendToClient(connectionId, {
          type: 'subscription_updated',
          data: { subscriptions: Array.from(connection.subscriptions) },
          timestamp: new Date().toISOString()
        });
      }
      break;

    case 'ping':
      connection.lastPing = Date.now();
      sendToClient(connectionId, {
        type: 'pong',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });
      break;

    case 'request_data':
      // Client requesting specific data
      handleDataRequest(connectionId, message.dataType, message.params);
      break;
  }
}

async function handleDataRequest(connectionId: string, dataType: string, params: any = {}) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  console.log(`📊 Data request from ${connectionId}: ${dataType}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (dataType) {
      case 'market_data':
        const symbols = params.symbols || Array.from(connection.subscriptions);
        await fetchAndStreamMarketData(connectionId, symbols);
        break;

      case 'bot_activities':
        await fetchAndStreamBotActivities(connectionId, connection.userId);
        break;

      case 'trading_performance':
        await fetchAndStreamTradingPerformance(connectionId, connection.userId);
        break;

      case 'risk_status':
        await fetchAndStreamRiskStatus(connectionId, connection.userId);
        break;
    }
  } catch (error) {
    console.error(`Error handling data request:`, error);
    sendToClient(connectionId, {
      type: 'error',
      data: { message: `Failed to fetch ${dataType}: ${error.message}` },
      timestamp: new Date().toISOString()
    });
  }
}

async function fetchAndStreamMarketData(connectionId: string, symbols: string[]) {
  try {
    // Call our data-fetch-service
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase.functions.invoke('data-fetch-service', {
      body: { action: 'fetch_market_data', symbols, force: true }
    });

    if (!error && data?.success) {
      sendToClient(connectionId, {
        type: 'market_data',
        data: data.result,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(error?.message || 'Failed to fetch market data');
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
  }
}

async function fetchAndStreamBotActivities(connectionId: string, userId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: activities, error } = await supabase
      .from('bot_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && activities) {
      sendToClient(connectionId, {
        type: 'bot_activities',
        data: activities,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching bot activities:', error);
  }
}

async function fetchAndStreamTradingPerformance(connectionId: string, userId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: bots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('user_id', userId);

    if (!error && bots) {
      const performance = bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        status: bot.status,
        currentBalance: bot.current_balance,
        totalPnl: bot.total_pnl,
        dailyPnl: bot.daily_pnl,
        winRate: bot.win_rate,
        totalTrades: bot.total_trades
      }));

      sendToClient(connectionId, {
        type: 'trading_performance',
        data: performance,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching trading performance:', error);
  }
}

async function fetchAndStreamRiskStatus(connectionId: string, userId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recent risk-related activities
    const { data: riskActivities, error } = await supabase
      .from('bot_activities')
      .select('*')
      .eq('user_id', userId)
      .or('activity_type.eq.risk_rejected,activity_type.eq.risk_analysis,activity_type.eq.trade_executed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && riskActivities) {
      const riskStatus = {
        recentRiskEvents: riskActivities,
        overallRiskLevel: calculateOverallRiskLevel(riskActivities),
        riskTrends: calculateRiskTrends(riskActivities)
      };

      sendToClient(connectionId, {
        type: 'risk_status',
        data: riskStatus,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching risk status:', error);
  }
}

function calculateOverallRiskLevel(activities: any[]): 'low' | 'medium' | 'high' {
  const recentActivities = activities.slice(0, 5);
  const riskRejections = recentActivities.filter(a => a.activity_type === 'risk_rejected').length;
  const totalActivities = recentActivities.length;

  if (totalActivities === 0) return 'medium';
  
  const rejectionRate = riskRejections / totalActivities;
  
  if (rejectionRate > 0.6) return 'high';
  if (rejectionRate > 0.3) return 'medium';
  return 'low';
}

function calculateRiskTrends(activities: any[]): any {
  // Simplified risk trend calculation
  const last24h = activities.filter(a => {
    const activityTime = new Date(a.created_at).getTime();
    const now = Date.now();
    return (now - activityTime) < 24 * 60 * 60 * 1000;
  });

  return {
    activitiesLast24h: last24h.length,
    riskRejectionsLast24h: last24h.filter(a => a.activity_type === 'risk_rejected').length,
    tradesExecutedLast24h: last24h.filter(a => a.activity_type === 'trade_executed').length
  };
}

async function startMarketDataStream(connectionId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  // Stream market data every 30 seconds
  const streamInterval = setInterval(async () => {
    if (!connections.has(connectionId)) {
      clearInterval(streamInterval);
      return;
    }

    try {
      await fetchAndStreamMarketData(connectionId, Array.from(connection.subscriptions));
    } catch (error) {
      console.error(`Error in market data stream for ${connectionId}:`, error);
    }
  }, 30000);

  // Initial data fetch
  setTimeout(() => {
    fetchAndStreamMarketData(connectionId, Array.from(connection.subscriptions));
  }, 1000);
}

function sendToClient(connectionId: string, data: any) {
  const connection = connections.get(connectionId);
  if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    connection.socket.send(JSON.stringify(data));
  } catch (error) {
    console.error(`Error sending data to ${connectionId}:`, error);
    connections.delete(connectionId);
  }
}

function broadcastToAll(data: any, filter?: (connection: ClientConnection) => boolean) {
  for (const [connectionId, connection] of connections.entries()) {
    if (!filter || filter(connection)) {
      sendToClient(connectionId, data);
    }
  }
}

// Broadcast system-wide alerts
export function broadcastAlert(alertType: 'market' | 'system' | 'risk', message: string, data?: any) {
  broadcastToAll({
    type: 'alert',
    alertType,
    data: {
      message,
      data,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
}

// Connection cleanup
setInterval(() => {
  const now = Date.now();
  const toRemove = [];

  for (const [connectionId, connection] of connections.entries()) {
    if (now - connection.lastPing > CONNECTION_TIMEOUT) {
      toRemove.push(connectionId);
    }
  }

  toRemove.forEach(connectionId => {
    console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
    connections.delete(connectionId);
  });

  console.log(`📊 Active connections: ${connections.size}`);
}, PING_INTERVAL);

console.log('🚀 Real-time data stream service started');