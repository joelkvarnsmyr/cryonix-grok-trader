import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  DollarSign,
  BarChart3,
  Target,
  Trash2,
  Settings 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradingBot {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  status: 'running' | 'paused' | 'stopped';
  initial_balance: number;
  current_balance: number;
  daily_pnl: number;
  total_pnl: number;
  daily_trades: number;
  total_trades: number;
  win_rate: number;
  max_drawdown: number;
  uptime_hours: number;
  version: string;
  created_at: string;
  updated_at: string;
}

const RealMultiBotManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [newBotConfig, setNewBotConfig] = useState({
    name: '',
    symbol: 'BTCUSDT',
    strategy: 'scalping',
    initial_balance: 1000
  });

  useEffect(() => {
    if (user) {
      fetchBots();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchBots = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('trading-bots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_bots',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Bot update received:', payload);
          fetchBots(); // Refresh the list when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleBotStatus = async (botId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running';
    
    try {
      // Call the trading-bot edge function
      const { data, error } = await supabase.functions.invoke('trading-bot', {
        body: {
          action: newStatus === 'running' ? 'start' : 'pause',
          botId: botId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bot ${newStatus === 'running' ? 'started' : 'paused'} successfully`,
      });

      fetchBots(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stopBot = async (botId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('trading-bot', {
        body: {
          action: 'stop',
          botId: botId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bot stopped successfully",
      });

      fetchBots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBot = async (botId: string) => {
    try {
      const { error } = await supabase
        .from('trading_bots')
        .delete()
        .eq('id', botId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bot deleted successfully",
      });

      fetchBots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createNewBot = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .insert({
          user_id: user?.id,
          name: newBotConfig.name,
          symbol: newBotConfig.symbol,
          strategy: newBotConfig.strategy,
          initial_balance: newBotConfig.initial_balance,
          current_balance: newBotConfig.initial_balance,
          status: 'stopped'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trading bot created successfully",
      });

      setShowCreateBot(false);
      setNewBotConfig({
        name: '',
        symbol: 'BTCUSDT',
        strategy: 'scalping',
        initial_balance: 1000
      });
      fetchBots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-success';
      case 'paused': return 'bg-warning';
      case 'stopped': return 'bg-destructive';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return Activity;
      case 'paused': return Pause;
      case 'stopped': return Square;
      default: return Activity;
    }
  };

  const getTotalStats = () => {
    return {
      totalBalance: bots.reduce((sum, bot) => sum + bot.current_balance, 0),
      totalDailyPnL: bots.reduce((sum, bot) => sum + bot.daily_pnl, 0),
      totalTrades: bots.reduce((sum, bot) => sum + bot.daily_trades, 0),
      avgWinRate: bots.length > 0 ? bots.reduce((sum, bot) => sum + bot.win_rate, 0) / bots.length : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multi-Bot Manager</h1>
          <p className="text-muted-foreground">Manage and monitor your trading bots</p>
        </div>
        <Dialog open={showCreateBot} onOpenChange={setShowCreateBot}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Trading Bot</DialogTitle>
              <DialogDescription>
                Configure your new trading bot with the settings below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  value={newBotConfig.name}
                  onChange={(e) => setNewBotConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Trading Bot"
                />
              </div>
              <div>
                <Label htmlFor="symbol">Trading Pair</Label>
                <Select 
                  value={newBotConfig.symbol} 
                  onValueChange={(value) => setNewBotConfig(prev => ({ ...prev, symbol: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                    <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                    <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                    <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                    <SelectItem value="XRPUSDT">XRP/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Select 
                  value={newBotConfig.strategy} 
                  onValueChange={(value) => setNewBotConfig(prev => ({ ...prev, strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scalping">Scalping</SelectItem>
                    <SelectItem value="swing">Swing Trading</SelectItem>
                    <SelectItem value="momentum">Momentum</SelectItem>
                    <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="balance">Initial Balance (USDT)</Label>
                <Input
                  id="balance"
                  type="number"
                  value={newBotConfig.initial_balance}
                  onChange={(e) => setNewBotConfig(prev => ({ ...prev, initial_balance: Number(e.target.value) }))}
                  min="100"
                  step="100"
                />
              </div>
              <Button onClick={createNewBot} className="w-full">
                Create Bot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">${stats.totalBalance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${stats.totalDailyPnL >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {stats.totalDailyPnL >= 0 ? 
                  <TrendingUp className="h-6 w-6 text-success" /> : 
                  <TrendingDown className="h-6 w-6 text-destructive" />
                }
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily P&L</p>
                <p className={`text-2xl font-bold ${stats.totalDailyPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${stats.totalDailyPnL.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{stats.totalTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Win Rate</p>
                <p className="text-2xl font-bold">{stats.avgWinRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bot List */}
      <div className="grid gap-6">
        {bots.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Trading Bots</h3>
                <p className="mb-4">Create your first trading bot to get started</p>
                <Button onClick={() => setShowCreateBot(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bot
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          bots.map((bot) => {
            const StatusIcon = getStatusIcon(bot.status);
            return (
              <Card key={bot.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getStatusColor(bot.status)}/10`}>
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(bot.status).replace('bg-', 'text-')}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{bot.name}</CardTitle>
                        <CardDescription>{bot.symbol} • {bot.strategy}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={bot.status === 'running' ? 'default' : 
                                   bot.status === 'paused' ? 'secondary' : 'destructive'}>
                        {bot.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">v{bot.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {bot.uptime_hours}h uptime
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-lg font-semibold">${bot.current_balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Daily P&L</p>
                      <p className={`text-lg font-semibold ${bot.daily_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${bot.daily_pnl.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Trades</p>
                      <p className="text-lg font-semibold">{bot.daily_trades}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-semibold">{bot.win_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Performance</span>
                      <span>{((bot.current_balance / bot.initial_balance - 1) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, ((bot.current_balance / bot.initial_balance - 1) * 100) + 50))} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={bot.status === 'running' ? "secondary" : "default"}
                      onClick={() => toggleBotStatus(bot.id, bot.status)}
                      disabled={bot.status === 'stopped'}
                    >
                      {bot.status === 'running' ? 
                        <><Pause className="h-4 w-4 mr-1" /> Pause</> : 
                        <><Play className="h-4 w-4 mr-1" /> Start</>
                      }
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => stopBot(bot.id)}
                      disabled={bot.status === 'stopped'}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                    
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4 mr-1" />
                      Settings
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteBot(bot.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RealMultiBotManager;