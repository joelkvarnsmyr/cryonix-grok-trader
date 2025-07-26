import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck,
  ShieldX,
  Clock,
  Filter,
  Search,
  RefreshCw,
  MessageSquare,
  Target,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface BotActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
  data: any;
  created_at: string;
  bot_id: string;
}

interface BacklogFilters {
  timeRange: 'all' | '1h' | '6h' | '24h' | '7d';
  symbol: 'all' | 'BTCUSDT' | 'ETHUSDT' | 'BNBUSDT' | 'SOLUSDT' | 'DOGEUSDT';
  activityType: 'all' | 'market_analysis' | 'trade_signal' | 'risk_rejected' | 'order_placed' | 'system';
  searchTerm: string;
}

const TradingBacklog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<BotActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BacklogFilters>({
    timeRange: '24h',
    symbol: 'all',
    activityType: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user, filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('bot_activities')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(200);

      // Apply time filter
      if (filters.timeRange !== 'all') {
        const timeMap = {
          '1h': 1,
          '6h': 6,
          '24h': 24,
          '7d': 24 * 7
        };
        const hoursAgo = timeMap[filters.timeRange];
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', cutoff);
      }

      // Apply activity type filter
      if (filters.activityType !== 'all') {
        query = query.eq('activity_type', filters.activityType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply symbol filter (check in data.symbol or extract from description)
      if (filters.symbol !== 'all') {
        filteredData = filteredData.filter(activity => 
          activity.data?.symbol === filters.symbol || 
          activity.description?.includes(filters.symbol) ||
          activity.title?.includes(filters.symbol)
        );
      }

      // Apply search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredData = filteredData.filter(activity =>
          activity.title?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          activity.data?.question?.toLowerCase().includes(searchLower) ||
          activity.data?.reasoning?.toLowerCase().includes(searchLower)
        );
      }

      setActivities(filteredData);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activity: BotActivity) => {
    switch (activity.activity_type) {
      case 'market_analysis':
        return <Brain className="h-4 w-4" />;
      case 'trade_signal':
        return activity.data?.action === 'buy' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
      case 'risk_rejected':
        return <ShieldX className="h-4 w-4" />;
      case 'order_placed':
        return <DollarSign className="h-4 w-4" />;
      case 'system':
        return <Target className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success/10 text-success border-success/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'info':
      default:
        return 'bg-info/10 text-info border-info/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderActivityDetails = (activity: BotActivity) => {
    const data = activity.data || {};
    
    return (
      <div className="space-y-3">
        {/* Self-Question */}
        {data.question && (
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Self-Question</span>
            </div>
            <p className="text-sm italic text-muted-foreground">"{data.question}"</p>
          </div>
        )}

        {/* AI Analysis Result */}
        {data.decision && (
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Decision:</span>
                <Badge variant={data.decision === 'buy' ? 'default' : data.decision === 'sell' ? 'destructive' : 'secondary'} className="ml-2">
                  {data.decision?.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Confidence:</span>
                <span className="ml-2">{data.confidence}%</span>
              </div>
            </div>
            {data.reasoning && (
              <p className="text-sm text-muted-foreground mt-2">{data.reasoning}</p>
            )}
          </div>
        )}

        {/* Trade Details */}
        {(data.symbol || data.quantity || data.price) && (
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Trade Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.symbol && (
                <div>
                  <span className="font-medium">Symbol:</span>
                  <span className="ml-2">{data.symbol}</span>
                </div>
              )}
              {data.quantity && (
                <div>
                  <span className="font-medium">Quantity:</span>
                  <span className="ml-2">${data.quantity}</span>
                </div>
              )}
              {data.price && (
                <div>
                  <span className="font-medium">Price:</span>
                  <span className="ml-2">${data.price}</span>
                </div>
              )}
              {data.orderId && (
                <div>
                  <span className="font-medium">Order ID:</span>
                  <span className="ml-2 font-mono text-xs">{data.orderId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Validation */}
        {activity.activity_type === 'risk_rejected' && (
          <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ShieldX className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Risk Management</span>
            </div>
            <p className="text-sm text-destructive/80">{activity.description}</p>
          </div>
        )}

        {/* Market Data Context */}
        {data.priceChange !== undefined && (
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Market Context</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.priceChange !== undefined && (
                <div>
                  <span className="font-medium">Price Change:</span>
                  <span className={`ml-2 ${data.priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {data.priceChange > 0 ? '+' : ''}{data.priceChange}%
                  </span>
                </div>
              )}
              {data.currentPrice && (
                <div>
                  <span className="font-medium">Current Price:</span>
                  <span className="ml-2">${data.currentPrice}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Trading Backlog
              </CardTitle>
              <CardDescription>
                Detailed log of bot's thoughts, analyses, and actions
              </CardDescription>
            </div>
            <Button onClick={loadActivities} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={filters.timeRange} onValueChange={(value: any) => setFilters(prev => ({ ...prev, timeRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
              <Select value={filters.symbol} onValueChange={(value: any) => setFilters(prev => ({ ...prev, symbol: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                  <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                  <SelectItem value="DOGEUSDT">DOGE/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Activity Type</label>
              <Select value={filters.activityType} onValueChange={(value: any) => setFilters(prev => ({ ...prev, activityType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="market_analysis">Market Analysis</SelectItem>
                  <SelectItem value="trade_signal">Trade Signals</SelectItem>
                  <SelectItem value="risk_rejected">Risk Rejected</SelectItem>
                  <SelectItem value="order_placed">Orders</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center space-y-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No activities found for the selected filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                        {getActivityIcon(activity)}
                      </div>
                      <div>
                        <h4 className="font-medium">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(activity.created_at)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), 'MMM dd, HH:mm:ss')}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  {activity.data && Object.keys(activity.data).length > 0 && (
                    <div className="border-t pt-4">
                      {renderActivityDetails(activity)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {activities.filter(a => a.activity_type === 'market_analysis').length}
                </div>
                <div className="text-sm text-muted-foreground">Analyses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {activities.filter(a => a.activity_type === 'order_placed').length}
                </div>
                <div className="text-sm text-muted-foreground">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {activities.filter(a => a.activity_type === 'risk_rejected').length}
                </div>
                <div className="text-sm text-muted-foreground">Risk Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {activities.filter(a => a.status === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {activities.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TradingBacklog;