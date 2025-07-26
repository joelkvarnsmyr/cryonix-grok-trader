import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import TradingBacklog from '@/components/TradingBacklog';
import { 
  Play, 
  Pause, 
  Square, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  DollarSign,
  BarChart3,
  Target,
  Settings,
  Brain,
  Zap 
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CryonixBotState {
  id?: string;
  name: string;
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
  risk_settings: {
    riskLevel: number;
    maxTradeAmount: number;
    stopLoss: number;
    takeProfit: number;
  };
  created_at?: string;
  updated_at?: string;
}

const CryonixBot = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bot, setBot] = useState<CryonixBotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autonomousLoopStatus, setAutonomousLoopStatus] = useState<'running' | 'stopped'>('stopped');

  // Form state for configuration
  const [formData, setFormData] = useState({
    initialBalance: '1000',
    riskLevel: '3',
    maxTradeAmount: '0.05',
    stopLoss: '0.02',
    takeProfit: '0.04'
  });

  useEffect(() => {
    if (user) {
      loadBot();
      checkAutonomousLoopStatus();
    }
  }, [user]);

  const loadBot = async () => {
    try {
      // Check if user already has a Cryonix bot
      const { data: existingBot, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('user_id', user?.id)
        .eq('name', 'Cryonix AI Trader')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading bot:', error);
        toast({
          title: "Error",
          description: "Failed to load bot data",
          variant: "destructive",
        });
      }

      setBot(existingBot);
    } catch (error) {
      console.error('Error in loadBot:', error);
      toast({
        title: "Error",
        description: "Failed to load bot data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAutonomousLoopStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('autonomous-trading-loop', {
        body: { action: 'check_status' }
      });

      if (!error && data?.isRunning) {
        setAutonomousLoopStatus('running');
        // Synka bot status med autonomous loop status
        if (bot?.status === 'stopped') {
          await supabase
            .from('trading_bots')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', bot.id)
            .eq('user_id', user?.id);
          
          setBot(prev => prev ? { ...prev, status: 'running' } : null);
        }
      } else {
        setAutonomousLoopStatus('stopped');
      }
    } catch (error) {
      console.log('Could not check autonomous loop status:', error);
    }
  };

  const createBot = async () => {
    if (!user) return;

    try {
      const riskSettings = {
        riskLevel: parseInt(formData.riskLevel),
        maxTradeAmount: parseFloat(formData.maxTradeAmount),
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit: parseFloat(formData.takeProfit)
      };

      const newBot = {
        user_id: user.id,
        name: 'Cryonix AI Trader',
        symbol: 'BTCUSDT', // Primary symbol, but bot will trade multiple
        strategy: 'ai_autonomous',
        status: 'stopped',
        initial_balance: parseFloat(formData.initialBalance),
        current_balance: parseFloat(formData.initialBalance),
        risk_settings: riskSettings
      };

      const { data, error } = await supabase
        .from('trading_bots')
        .insert([newBot])
        .select()
        .single();

      if (error) throw error;

      setBot(data);
      setDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Cryonix AI Trader has been initialized!",
      });
    } catch (error) {
      console.error('Error creating bot:', error);
      toast({
        title: "Error",
        description: "Failed to create bot",
        variant: "destructive",
      });
    }
  };

  const handleBotAction = async (action: 'start' | 'pause' | 'stop') => {
    if (!bot || !user) return;

    try {
      const { error } = await supabase.functions.invoke('trading-bot', {
        body: {
          action,
          botId: bot.id
        }
      });

      if (error) throw error;

      // Update local state with correct status mapping
      const newStatus = action === 'start' ? 'running' : action === 'pause' ? 'paused' : 'stopped';
      setBot(prev => prev ? { ...prev, status: newStatus } : null);
      
      if (action === 'start') {
        setAutonomousLoopStatus('running');
        // Dubbelkolla att autonomous loop verkligen körs
        setTimeout(checkAutonomousLoopStatus, 2000);
      } else if (action === 'stop') {
        setAutonomousLoopStatus('stopped');
      }

      toast({
        title: action === 'start' ? "Bot Started" : action === 'pause' ? "Bot Paused" : "Bot Stopped",
        description: action === 'start' 
          ? "Cryonix AI Trader is now active and analyzing market conditions" 
          : action === 'pause' 
          ? "Trading bot is paused - no new trades will be executed"
          : "Trading bot has been stopped",
        variant: action === 'stop' ? "destructive" : "default",
      });

      // Ladda om bot-data för att säkerställa synkronisering
      setTimeout(loadBot, 1000);

    } catch (error) {
      console.error(`Error ${action}ing bot:`, error);
      toast({
        title: "Action Failed",
        description: error.message || `Failed to ${action} the trading bot`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: { variant: 'default' as const, icon: Play, color: 'text-success' },
      paused: { variant: 'secondary' as const, icon: Pause, color: 'text-warning' },
      stopped: { variant: 'outline' as const, icon: Square, color: 'text-muted-foreground' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.stopped;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <IconComponent className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welcome to Cryonix</h2>
            <p className="text-muted-foreground">
              Your intelligent, autonomous cryptocurrency trading assistant
            </p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Initialize Your AI Trading Bot</CardTitle>
            <CardDescription>
              Configure your autonomous trading bot with AI-powered decision making, 
              risk management, and real-time market analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  Initialize Cryonix AI Trader
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure Cryonix</DialogTitle>
                  <DialogDescription>
                    Set up your autonomous trading parameters
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance">Initial Balance (USDT)</Label>
                    <Input
                      id="initialBalance"
                      type="number"
                      placeholder="1000"
                      value={formData.initialBalance}
                      onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Level (1-5)</Label>
                    <Select 
                      value={formData.riskLevel} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, riskLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Conservative</SelectItem>
                        <SelectItem value="2">2 - Conservative</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Aggressive</SelectItem>
                        <SelectItem value="5">5 - Very Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTradeAmount">Max Trade Amount (%)</Label>
                    <Input
                      id="maxTradeAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.05"
                      value={formData.maxTradeAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxTradeAmount: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Maximum % of balance per trade</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        step="0.01"
                        placeholder="0.02"
                        value={formData.stopLoss}
                        onChange={(e) => setFormData(prev => ({ ...prev, stopLoss: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="takeProfit">Take Profit (%)</Label>
                      <Input
                        id="takeProfit"
                        type="number"
                        step="0.01"
                        placeholder="0.04"
                        value={formData.takeProfit}
                        onChange={(e) => setFormData(prev => ({ ...prev, takeProfit: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button onClick={createBot} className="w-full">
                    <Brain className="h-4 w-4 mr-2" />
                    Initialize Bot
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI-Powered</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Uses Google AI for intelligent market analysis and decision making
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Autonomous</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Runs continuously, making trades based on market conditions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Risk Managed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built-in risk management with stop losses and position limits
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cryonix AI Trader</h1>
            <div className="flex items-center gap-2">
              {getStatusBadge(bot.status)}
              {autonomousLoopStatus === 'running' && (
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3 text-primary" />
                  Autonomous Mode
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {bot.status === 'stopped' && (
            <Button onClick={() => handleBotAction('start')} className="gap-2">
              <Play className="h-4 w-4" />
              Start Trading
            </Button>
          )}
          {bot.status === 'running' && (
            <>
              <Button onClick={() => handleBotAction('pause')} variant="outline" className="gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button onClick={() => handleBotAction('stop')} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}
          {bot.status === 'paused' && (
            <>
              <Button onClick={() => handleBotAction('start')} className="gap-2">
                <Play className="h-4 w-4" />
                Resume
              </Button>
              <Button onClick={() => handleBotAction('stop')} variant="outline" className="gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${bot.current_balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Started: ${bot.initial_balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {bot.total_pnl >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${bot.total_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${bot.total_pnl.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(((bot.current_balance - bot.initial_balance) / bot.initial_balance) * 100).toFixed(2)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bot.win_rate.toFixed(1)}%</div>
            <Progress value={bot.win_rate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bot.total_trades}</div>
            <p className="text-xs text-muted-foreground">
              {bot.daily_trades} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bot Details Tabs */}
      <Tabs defaultValue="backlog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backlog">Trading Backlog</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="backlog">
          <TradingBacklog />
        </TabsContent>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription>Current trading parameters and risk settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Risk Level</Label>
                  <p className="text-2xl font-bold">{bot.risk_settings.riskLevel}/5</p>
                  <p className="text-xs text-muted-foreground">Current risk appetite</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Trade Amount</Label>
                  <p className="text-2xl font-bold">{(bot.risk_settings.maxTradeAmount * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Of total balance per trade</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Stop Loss</Label>
                  <p className="text-2xl font-bold">{(bot.risk_settings.stopLoss * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Automatic loss limit</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Take Profit</Label>
                  <p className="text-2xl font-bold">{(bot.risk_settings.takeProfit * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Profit taking threshold</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Max Drawdown</span>
                    <span className="font-medium">{bot.max_drawdown.toFixed(2)}%</span>
                  </div>
                  <Progress value={Math.abs(bot.max_drawdown)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Win Rate</span>
                    <span className="font-medium">{bot.win_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={bot.win_rate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Total Trades</span>
                  <span className="font-medium">{bot.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Today's Trades</span>
                  <span className="font-medium">{bot.daily_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Uptime</span>
                  <span className="font-medium">{bot.uptime_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Today's P&L</span>
                  <span className={`font-medium ${bot.daily_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${bot.daily_pnl.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CryonixBot;