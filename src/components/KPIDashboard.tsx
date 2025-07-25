import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  Activity
} from 'lucide-react';

interface KPIMetrics {
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  totalTrades: number;
  avgTradeDuration: number;
  successRate: number;
  riskAdjustedReturn: number;
  volatility: number;
}

interface PerformanceData {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
  balance: number;
}

const KPIDashboard = () => {
  const [timeframe, setTimeframe] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('winRate');
  
  const [currentKPIs, setCurrentKPIs] = useState<KPIMetrics>({
    winRate: 68.4,
    profitFactor: 1.94,
    sharpeRatio: 1.67,
    maxDrawdown: -4.2,
    totalReturn: 23.4,
    totalTrades: 342,
    avgTradeDuration: 4.2,
    successRate: 89.2,
    riskAdjustedReturn: 18.7,
    volatility: 12.3
  });

  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([
    { date: '2025-07-18', pnl: 145.30, trades: 12, winRate: 75.0, balance: 10145.30 },
    { date: '2025-07-19', pnl: -23.40, trades: 8, winRate: 62.5, balance: 10121.90 },
    { date: '2025-07-20', pnl: 267.80, trades: 15, winRate: 80.0, balance: 10389.70 },
    { date: '2025-07-21', pnl: 89.50, trades: 11, winRate: 72.7, balance: 10479.20 },
    { date: '2025-07-22', pnl: -67.20, trades: 9, winRate: 55.6, balance: 10412.00 },
    { date: '2025-07-23', pnl: 234.50, trades: 14, winRate: 78.6, balance: 10646.50 },
    { date: '2025-07-24', pnl: 156.70, trades: 10, winRate: 70.0, balance: 10803.20 }
  ]);

  const [benchmarks] = useState({
    winRate: { target: 70, warning: 60, critical: 50 },
    profitFactor: { target: 2.0, warning: 1.5, critical: 1.0 },
    sharpeRatio: { target: 1.5, warning: 1.0, critical: 0.5 },
    maxDrawdown: { target: -5, warning: -10, critical: -15 },
    successRate: { target: 90, warning: 85, critical: 80 }
  });

  const getKPIStatus = (metric: string, value: number) => {
    const benchmark = benchmarks[metric as keyof typeof benchmarks];
    if (!benchmark) return 'secondary';
    
    if (metric === 'maxDrawdown') {
      if (value >= benchmark.target) return 'success';
      if (value >= benchmark.warning) return 'warning';
      return 'danger';
    } else {
      if (value >= benchmark.target) return 'success';
      if (value >= benchmark.warning) return 'warning';
      return 'danger';
    }
  };

  const getKPIIcon = (metric: string) => {
    switch (metric) {
      case 'winRate': return <Target className="w-5 h-5" />;
      case 'profitFactor': return <DollarSign className="w-5 h-5" />;
      case 'sharpeRatio': return <TrendingUp className="w-5 h-5" />;
      case 'maxDrawdown': return <AlertTriangle className="w-5 h-5" />;
      case 'totalReturn': return <Percent className="w-5 h-5" />;
      case 'avgTradeDuration': return <Clock className="w-5 h-5" />;
      case 'successRate': return <Award className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const formatKPIValue = (metric: string, value: number) => {
    switch (metric) {
      case 'winRate':
      case 'successRate':
      case 'totalReturn':
      case 'volatility':
        return `${value.toFixed(1)}%`;
      case 'maxDrawdown':
        return `${value.toFixed(1)}%`;
      case 'profitFactor':
      case 'sharpeRatio':
      case 'riskAdjustedReturn':
        return value.toFixed(2);
      case 'avgTradeDuration':
        return `${value.toFixed(1)}h`;
      case 'totalTrades':
        return value.toString();
      default:
        return value.toFixed(2);
    }
  };

  const getProgressValue = (metric: string, value: number) => {
    const benchmark = benchmarks[metric as keyof typeof benchmarks];
    if (!benchmark) return 50;
    
    if (metric === 'maxDrawdown') {
      return Math.min(100, Math.max(0, (Math.abs(value) / Math.abs(benchmark.critical)) * 100));
    } else {
      return Math.min(100, (value / benchmark.target) * 100);
    }
  };

  const totalPnL = performanceHistory.reduce((sum, day) => sum + day.pnl, 0);
  const totalTrades = performanceHistory.reduce((sum, day) => sum + day.trades, 0);
  const avgDailyPnL = totalPnL / performanceHistory.length;
  const bestDay = Math.max(...performanceHistory.map(d => d.pnl));
  const worstDay = Math.min(...performanceHistory.map(d => d.pnl));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">KPI Dashboard</h2>
          <p className="text-muted-foreground">Detaljerad prestanda analys och nyckeltal</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 dag</SelectItem>
              <SelectItem value="7d">7 dagar</SelectItem>
              <SelectItem value="30d">30 dagar</SelectItem>
              <SelectItem value="90d">90 dagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Period P&L</p>
                <div className="flex items-center gap-1">
                  {totalPnL >= 0 ? 
                    <TrendingUp className="w-4 h-4 text-success" /> : 
                    <TrendingDown className="w-4 h-4 text-danger" />
                  }
                  <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                  </p>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Daily P&L</p>
                <p className={`text-lg font-bold ${avgDailyPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${avgDailyPnL >= 0 ? '+' : ''}{avgDailyPnL.toFixed(2)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-lg font-bold">{totalTrades}</p>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-lg font-bold">${performanceHistory[performanceHistory.length - 1]?.balance.toLocaleString()}</p>
              </div>
              <PieChart className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main KPI Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="performance">Prestanda</TabsTrigger>
          <TabsTrigger value="risk">Risk Analys</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(currentKPIs).map(([key, value]) => {
              const status = getKPIStatus(key, value);
              const progress = getProgressValue(key, value);
              
              return (
                <Card key={key} className="bg-gradient-card border-border shadow-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getKPIIcon(key)}
                        <CardTitle className="text-base capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </CardTitle>
                      </div>
                      <Badge variant={status as any}>
                        {status === 'success' ? 'Excellent' : status === 'warning' ? 'Good' : 'Poor'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatKPIValue(key, value)}
                      </span>
                      {key !== 'totalTrades' && (
                        <span className="text-sm text-muted-foreground">
                          Target: {formatKPIValue(key, benchmarks[key as keyof typeof benchmarks]?.target || 0)}
                        </span>
                      )}
                    </div>
                    
                    {key !== 'totalTrades' && (
                      <div className="space-y-1">
                        <Progress 
                          value={progress} 
                          className={`h-2 ${
                            status === 'success' ? '[&>div]:bg-success' :
                            status === 'warning' ? '[&>div]:bg-warning' : '[&>div]:bg-danger'
                          }`}
                        />
                        <p className="text-xs text-muted-foreground">
                          Performance vs target
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Daily Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceHistory.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString('sv-SE')}</p>
                        <p className="text-sm text-muted-foreground">{day.trades} trades</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${day.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          ${day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">{day.winRate}% win rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Best Day</p>
                    <p className="text-lg font-semibold text-success">+${bestDay.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Worst Day</p>
                    <p className="text-lg font-semibold text-danger">${worstDay.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Profitable Days</span>
                    <span className="font-semibold">
                      {performanceHistory.filter(d => d.pnl > 0).length}/{performanceHistory.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Win Rate</span>
                    <span className="font-semibold">
                      {(performanceHistory.reduce((sum, d) => sum + d.winRate, 0) / performanceHistory.length).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance Growth</span>
                    <span className="font-semibold text-success">
                      +{((performanceHistory[performanceHistory.length - 1].balance / 10000 - 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max Drawdown</span>
                    <div className="text-right">
                      <span className="text-danger font-semibold">{currentKPIs.maxDrawdown}%</span>
                      <Badge variant="secondary" className="ml-2 text-warning">Warning</Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volatility</span>
                    <span className="font-semibold">{currentKPIs.volatility}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Risk-Adjusted Return</span>
                    <span className="font-semibold text-success">{currentKPIs.riskAdjustedReturn}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-semibold">{currentKPIs.sharpeRatio}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-warning">Risk Warnings</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Drawdown närmar sig -5% gräns</li>
                    <li>• Volatilitet över normal nivå</li>
                    <li>• Överväg position size justering</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Risk Limits Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Daily Trades (per bot)</span>
                      <span>8/20</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Position Size</span>
                      <span>18%/30%</span>
                    </div>
                    <Progress value={60} className="h-2 [&>div]:bg-success" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Active Bots</span>
                      <span>1/2</span>
                    </div>
                    <Progress value={50} className="h-2 [&>div]:bg-primary" />
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-success">All Systems Green</h4>
                  <p className="text-sm text-muted-foreground">
                    Alla risk parametrar inom acceptabla gränser
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" />
                Performance vs Benchmarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2">Metric</th>
                      <th className="text-right py-2">Current</th>
                      <th className="text-right py-2">Target</th>
                      <th className="text-right py-2">Warning</th>
                      <th className="text-right py-2">Critical</th>
                      <th className="text-center py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(benchmarks).map(([key, benchmark]) => {
                      const current = currentKPIs[key as keyof KPIMetrics];
                      const status = getKPIStatus(key, current);
                      
                      return (
                        <tr key={key} className="border-b border-border">
                          <td className="py-3 font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          <td className="text-right py-3 font-semibold">
                            {formatKPIValue(key, current)}
                          </td>
                          <td className="text-right py-3 text-success">
                            {formatKPIValue(key, benchmark.target)}
                          </td>
                          <td className="text-right py-3 text-warning">
                            {formatKPIValue(key, benchmark.warning)}
                          </td>
                          <td className="text-right py-3 text-danger">
                            {formatKPIValue(key, benchmark.critical)}
                          </td>
                          <td className="text-center py-3">
                            <Badge variant={status as any}>
                              {status === 'success' ? 'Excellent' : 
                               status === 'warning' ? 'Good' : 'Poor'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KPIDashboard;