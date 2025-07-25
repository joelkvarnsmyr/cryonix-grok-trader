import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  Zap
} from 'lucide-react';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  timestamp: string;
}

interface Trade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  price: number;
  confidence: number;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
}

const TradingDashboard = () => {
  const [marketData, setMarketData] = useState<MarketData>({
    symbol: 'BTCUSDT',
    price: 67428.50,
    change: 2.34,
    volume: 45673.82,
    timestamp: new Date().toISOString()
  });

  const [trades, setTrades] = useState<Trade[]>([
    {
      id: '1',
      symbol: 'BTCUSDT',
      action: 'BUY',
      quantity: 0.0015,
      price: 67200.00,
      confidence: 0.78,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: 'COMPLETED'
    },
    {
      id: '2',
      symbol: 'BTCUSDT',
      action: 'HOLD',
      quantity: 0,
      price: 67428.50,
      confidence: 0.45,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      status: 'COMPLETED'
    }
  ]);

  const [systemStatus, setSystemStatus] = useState({
    binance: 'CONNECTED',
    grok: 'ACTIVE',
    riskEngine: 'MONITORING',
    websocket: 'LIVE'
  });

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => ({
        ...prev,
        price: prev.price + (Math.random() - 0.5) * 100,
        change: (Math.random() - 0.5) * 5,
        timestamp: new Date().toISOString()
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'ACTIVE':
      case 'LIVE':
        return 'success';
      case 'MONITORING':
        return 'warning';
      default:
        return 'danger';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'success';
      case 'SELL':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cryonix Trading Bot</h1>
          <p className="text-muted-foreground">v3.1 | Autonomous Cryptocurrency Trading</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle className="w-4 h-4 mr-2" />
            Testnet Mode
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Binance API</p>
                <Badge variant={getStatusColor(systemStatus.binance) as any} className="mt-1">
                  {systemStatus.binance}
                </Badge>
              </div>
              <Activity className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Grok Analysis</p>
                <Badge variant={getStatusColor(systemStatus.grok) as any} className="mt-1">
                  {systemStatus.grok}
                </Badge>
              </div>
              <Zap className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Risk Engine</p>
                <Badge variant={getStatusColor(systemStatus.riskEngine) as any} className="mt-1">
                  {systemStatus.riskEngine}
                </Badge>
              </div>
              <Shield className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WebSocket</p>
                <Badge variant={getStatusColor(systemStatus.websocket) as any} className="mt-1">
                  {systemStatus.websocket}
                </Badge>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Data */}
        <Card className="lg:col-span-2 bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Market Data - {marketData.symbol}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatPrice(marketData.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {marketData.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-danger" />
                    )}
                    <span className={marketData.change >= 0 ? 'text-success' : 'text-danger'}>
                      {formatChange(marketData.change)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">24h Volume</p>
                  <p className="text-lg font-semibold">{marketData.volume.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Real-time chart would be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-warning" />
              Risk Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Position Size</span>
                <span>18% of portfolio</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-success h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Max: 30%</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Daily Trades</span>
                <span>2 / 20</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-primary h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Trades executed today</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Portfolio Value</span>
                <span>$12,450.67</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success text-sm">+3.2% today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="analysis">Grok Analysis</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={getActionColor(trade.action) as any}>
                        {trade.action}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(trade.price)}</p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {(trade.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                AI Analysis Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Latest Grok Signal</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Based on market sentiment and technical analysis, the recommendation is to HOLD position.
                  </p>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">HOLD</Badge>
                    <span className="text-sm">Confidence: 45%</span>
                    <span className="text-sm text-muted-foreground">Fallback: SMA Strategy</span>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Technical Indicators</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">SMA (10):</span>
                      <span className="ml-2 font-medium">$67,245</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SMA (50):</span>
                      <span className="ml-2 font-medium">$66,890</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RSI:</span>
                      <span className="ml-2 font-medium">62.4</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volume:</span>
                      <span className="ml-2 font-medium">Normal</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Trading Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Watchlist:</span>
                        <span>BTCUSDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Position:</span>
                        <span>30%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Trade Limit:</span>
                        <span>20</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mode:</span>
                        <span className="text-success">Testnet</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Integrations</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Grok Model:</span>
                        <span>grok-3</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WebSocket Timeout:</span>
                        <span>1800s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache TTL:</span>
                        <span>60s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Strategy:</span>
                        <span>SMA Crossover</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingDashboard;