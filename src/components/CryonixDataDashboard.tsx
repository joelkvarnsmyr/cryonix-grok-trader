import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Newspaper,
  Globe,
  Bot,
  Wifi,
  WifiOff
} from 'lucide-react';

interface MarketData {
  symbol: string;
  price: number;
  change_24h: number;
  change_percent_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  timestamp: string;
}

interface TrendData {
  term: string;
  currentInterest: number;
  changePercent: number;
  trendDirection: 'rising' | 'falling' | 'stable';
  searchVolume: 'low' | 'medium' | 'high';
}

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
}

interface RealtimeData {
  marketData: MarketData[];
  sentiment: any;
  googleTrends: { successful: TrendData[]; trendData: any };
  news: { successful: NewsItem[]; newsData: any };
  technicalIndicators: any;
  botActivities: any[];
  connected: boolean;
}

const CryonixDataDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({
    marketData: [],
    sentiment: null,
    googleTrends: { successful: [], trendData: {} },
    news: { successful: [], newsData: {} },
    technicalIndicators: null,
    botActivities: [],
    connected: false
  });

  const [systemStatus, setSystemStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (user) {
      initializeWebSocket();
      fetchInitialData();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshAllData();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const initializeWebSocket = () => {
    if (!user) return;

    try {
      const wsUrl = `wss://mykiihodfokpskccbvfb.functions.supabase.co/realtime-data-stream?userId=${user.id}&apiKey=public`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected to real-time data stream');
        setRealtimeData(prev => ({ ...prev, connected: true }));
        setSystemStatus('green');
        
        // Request initial data
        ws.send(JSON.stringify({ 
          type: 'request_data', 
          dataType: 'market_data',
          params: { symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'] }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setRealtimeData(prev => ({ ...prev, connected: false }));
        setSystemStatus('red');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (user) {
            initializeWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setSystemStatus('red');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setSystemStatus('red');
    }
  };

  const handleWebSocketMessage = (data: any) => {
    setLastUpdate(new Date());

    switch (data.type) {
      case 'market_data':
        if (data.data?.successful) {
          setRealtimeData(prev => ({
            ...prev,
            marketData: data.data.successful
          }));
        }
        break;

      case 'bot_activities':
        setRealtimeData(prev => ({
          ...prev,
          botActivities: data.data || []
        }));
        break;

      case 'alert':
        toast({
          title: `${data.alertType.toUpperCase()} Alert`,
          description: data.data.message,
          variant: data.alertType === 'risk' ? 'destructive' : 'default'
        });
        break;

      case 'system':
        console.log('System message:', data.data);
        break;
    }
  };

  const fetchInitialData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('data-fetch-service', {
        body: { 
          action: 'fetch_all_data',
          symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'],
          newsKeywords: ['Bitcoin', 'Ethereum', 'Cryptocurrency', 'Crypto regulation']
        }
      });

      if (!error && data?.success) {
        const result = data.result;
        setRealtimeData(prev => ({
          ...prev,
          marketData: result.marketData?.successful || [],
          sentiment: result.sentiment,
          googleTrends: result.googleTrends || { successful: [], trendData: {} },
          news: result.news || { successful: [], newsData: {} },
          technicalIndicators: result.technicalIndicators
        }));
        
        setSystemStatus('green');
        toast({
          title: "Data Loaded",
          description: "Successfully loaded comprehensive market data",
        });
      } else {
        throw new Error(error?.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setSystemStatus('red');
      toast({
        title: "Data Load Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const refreshAllData = async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'request_data', 
        dataType: 'market_data' 
      }));
      wsRef.current.send(JSON.stringify({ 
        type: 'request_data', 
        dataType: 'bot_activities' 
      }));
    } else {
      await fetchInitialData();
    }
  };

  const getStatusColor = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'text-green-500';
      case 'yellow': return 'text-yellow-500';
      case 'red': return 'text-red-500';
    }
  };

  const getStatusIcon = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return <CheckCircle className="h-4 w-4" />;
      case 'yellow': return <AlertTriangle className="h-4 w-4" />;
      case 'red': return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const formatPercentage = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Cryonix Data Dashboard</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {realtimeData.connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {realtimeData.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className={`flex items-center gap-2 ${getStatusColor(systemStatus)}`}>
                {getStatusIcon(systemStatus)}
                <span className="text-sm font-medium">
                  Status: {systemStatus.toUpperCase()}
                </span>
              </div>
              
              <Button
                onClick={refreshAllData}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Refresh
              </Button>
              
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
              >
                Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()} • 
            Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="market" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="market">Market Data</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="activity">Bot Activity</TabsTrigger>
        </TabsList>

        {/* Market Data Tab */}
        <TabsContent value="market" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realtimeData.marketData.map((market) => (
              <Card key={market.symbol}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{market.symbol}</CardTitle>
                    <Badge variant={market.change_percent_24h >= 0 ? "default" : "destructive"}>
                      {market.change_percent_24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {formatPercentage(market.change_percent_24h)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {formatPrice(market.price)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>High: {formatPrice(market.high_24h)}</div>
                      <div>Low: {formatPrice(market.low_24h)}</div>
                      <div>Vol: {(market.volume_24h / 1000000).toFixed(2)}M</div>
                      <div>Change: {formatPrice(market.change_24h)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Market Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {realtimeData.sentiment?.success ? (
                  <div className="space-y-3">
                    <p className="text-sm">{realtimeData.sentiment.analysis}</p>
                    <div className="text-xs text-muted-foreground">
                      Analysis based on: {realtimeData.sentiment.marketSummary}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No AI sentiment data available</p>
                )}
              </CardContent>
            </Card>

            {/* Google Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Google Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {realtimeData.googleTrends.successful.length > 0 ? (
                  <div className="space-y-3">
                    {realtimeData.googleTrends.successful.slice(0, 3).map((trend) => (
                      <div key={trend.term} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{trend.term}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            trend.trendDirection === 'rising' ? 'default' :
                            trend.trendDirection === 'falling' ? 'destructive' : 'secondary'
                          }>
                            {trend.trendDirection}
                          </Badge>
                          <span className="text-sm">{trend.currentInterest}</span>
                        </div>
                      </div>
                    ))}
                    {realtimeData.googleTrends.trendData?.overallSentiment && (
                      <div className="pt-2 border-t text-sm">
                        <strong>Overall:</strong> {realtimeData.googleTrends.trendData.overallSentiment.description}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No Google Trends data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Crypto News Feed
              </CardTitle>
              <CardDescription>
                {realtimeData.news.newsData?.sentimentBreakdown && (
                  <div className="flex gap-4 mt-2">
                    <span className="text-green-600">
                      Positive: {realtimeData.news.newsData.sentimentBreakdown.positive}%
                    </span>
                    <span className="text-red-600">
                      Negative: {realtimeData.news.newsData.sentimentBreakdown.negative}%
                    </span>
                    <span className="text-gray-600">
                      Neutral: {realtimeData.news.newsData.sentimentBreakdown.neutral}%
                    </span>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {realtimeData.news.successful.length > 0 ? (
                <div className="space-y-4">
                  {realtimeData.news.successful.slice(0, 5).map((news) => (
                    <div key={news.id} className="border-l-4 border-primary pl-4 space-y-1">
                      <h4 className="font-medium text-sm">{news.headline}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{news.source}</span>
                        <span>•</span>
                        <span>{new Date(news.timestamp).toLocaleTimeString()}</span>
                        <Badge 
                          variant={
                            news.sentiment === 'positive' ? 'default' :
                            news.sentiment === 'negative' ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {news.sentiment}
                        </Badge>
                        <span>Relevance: {news.relevanceScore.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No news data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Indicators Tab */}
        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Technical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {realtimeData.technicalIndicators?.successful?.length > 0 ? (
                <div className="space-y-4">
                  {realtimeData.technicalIndicators.successful.map((item: any) => (
                    <div key={item.symbol} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">{item.symbol}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {item.indicators.sma20 && (
                          <div>
                            <span className="text-muted-foreground">SMA 20:</span>
                            <div className="font-medium">{formatPrice(item.indicators.sma20)}</div>
                          </div>
                        )}
                        {item.indicators.rsi && (
                          <div>
                            <span className="text-muted-foreground">RSI:</span>
                            <div className="font-medium">{item.indicators.rsi.toFixed(2)}</div>
                          </div>
                        )}
                        {item.indicators.supportResistance && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Support:</span>
                              <div className="font-medium">{formatPrice(item.indicators.supportResistance.support)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Resistance:</span>
                              <div className="font-medium">{formatPrice(item.indicators.supportResistance.resistance)}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {realtimeData.technicalIndicators.indicators?.summary && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Market Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-green-600">Bullish:</span> {realtimeData.technicalIndicators.indicators.summary.bullishSymbols}
                        </div>
                        <div>
                          <span className="text-red-600">Bearish:</span> {realtimeData.technicalIndicators.indicators.summary.bearishSymbols}
                        </div>
                        <div>
                          <span className="text-gray-600">Neutral:</span> {realtimeData.technicalIndicators.indicators.summary.neutralSymbols}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No technical analysis data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Bot Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {realtimeData.botActivities.length > 0 ? (
                <div className="space-y-3">
                  {realtimeData.botActivities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`mt-1 h-2 w-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'error' ? 'bg-red-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span>{activity.activity_type}</span>
                          {activity.bot_id !== 'system' && (
                            <>
                              <span>•</span>
                              <span>Bot: {activity.bot_id}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No bot activities recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CryonixDataDashboard;