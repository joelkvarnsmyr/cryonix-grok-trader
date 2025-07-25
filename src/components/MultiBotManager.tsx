import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Play, 
  Square, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Eye
} from 'lucide-react';

interface BotInstance {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  status: 'active' | 'paused' | 'stopped' | 'error';
  balance: number;
  dailyPnL: number;
  dailyTrades: number;
  lastTrade: string;
  winRate: number;
  uptime: string;
  version: string;
}

const MultiBotManager = () => {
  const [maxActiveBots] = useState(2);
  const [bots, setBots] = useState<BotInstance[]>([
    {
      id: 'bot-1',
      name: 'Cryonix Alpha',
      symbol: 'BTCUSDT',
      strategy: 'Grok + SMA Hybrid',
      status: 'active',
      balance: 12450.67,
      dailyPnL: 234.50,
      dailyTrades: 8,
      lastTrade: '2 minutes ago',
      winRate: 68.4,
      uptime: '23h 14m',
      version: 'v3.1'
    },
    {
      id: 'bot-2',
      name: 'Cryonix Beta',
      symbol: 'ETHUSDT',
      strategy: 'SMA Crossover',
      status: 'paused',
      balance: 8765.32,
      dailyPnL: -45.20,
      dailyTrades: 12,
      lastTrade: '15 minutes ago',
      winRate: 62.1,
      uptime: '18h 42m',
      version: 'v3.1'
    }
  ]);

  const [newBotConfig, setNewBotConfig] = useState({
    name: '',
    symbol: 'BTCUSDT',
    strategy: 'grok_sma_hybrid',
    initialBalance: 5000
  });

  const [showCreateBot, setShowCreateBot] = useState(false);

  const activeBots = bots.filter(bot => bot.status === 'active').length;
  const canCreateNewBot = bots.length < 4; // Max 4 total bots
  const canActivateBot = activeBots < maxActiveBots;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'stopped': return 'secondary';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4" />;
      case 'paused': return <Square className="w-4 h-4" />;
      case 'stopped': return <Square className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  const toggleBotStatus = (botId: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        if (bot.status === 'active') {
          return { ...bot, status: 'paused' };
        } else if (bot.status === 'paused' && canActivateBot) {
          return { ...bot, status: 'active' };
        } else if (bot.status === 'paused' && !canActivateBot) {
          // Cannot activate - max active bots reached
          return bot;
        }
      }
      return bot;
    }));
  };

  const createNewBot = () => {
    if (!canCreateNewBot || !newBotConfig.name) return;

    const newBot: BotInstance = {
      id: `bot-${Date.now()}`,
      name: newBotConfig.name,
      symbol: newBotConfig.symbol,
      strategy: newBotConfig.strategy === 'grok_sma_hybrid' ? 'Grok + SMA Hybrid' : 
                newBotConfig.strategy === 'sma_only' ? 'SMA Crossover' : 'Grok Only',
      status: canActivateBot ? 'active' : 'paused',
      balance: newBotConfig.initialBalance,
      dailyPnL: 0,
      dailyTrades: 0,
      lastTrade: 'Never',
      winRate: 0,
      uptime: '0h 0m',
      version: 'v3.1'
    };

    setBots(prev => [...prev, newBot]);
    setNewBotConfig({ name: '', symbol: 'BTCUSDT', strategy: 'grok_sma_hybrid', initialBalance: 5000 });
    setShowCreateBot(false);
  };

  const deleteBot = (botId: string) => {
    setBots(prev => prev.filter(bot => bot.id !== botId));
  };

  const getTotalStats = () => {
    const totalBalance = bots.reduce((sum, bot) => sum + bot.balance, 0);
    const totalPnL = bots.reduce((sum, bot) => sum + bot.dailyPnL, 0);
    const totalTrades = bots.reduce((sum, bot) => sum + bot.dailyTrades, 0);
    const avgWinRate = bots.length > 0 ? bots.reduce((sum, bot) => sum + bot.winRate, 0) / bots.length : 0;

    return { totalBalance, totalPnL, totalTrades, avgWinRate };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Multi-Bot Manager</h2>
          <p className="text-muted-foreground">
            Hantera upp till {maxActiveBots} aktiva bots samtidigt | {activeBots}/{maxActiveBots} aktiva
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateBot(true)}
          disabled={!canCreateNewBot}
          className="bg-gradient-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ny Bot
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-lg font-bold">${stats.totalBalance.toLocaleString()}</p>
              </div>
              <Bot className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily P&L</p>
                <div className="flex items-center gap-1">
                  {stats.totalPnL >= 0 ? 
                    <TrendingUp className="w-4 h-4 text-success" /> : 
                    <TrendingDown className="w-4 h-4 text-danger" />
                  }
                  <p className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)}
                  </p>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-lg font-bold">{stats.totalTrades}</p>
              </div>
              <Activity className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Win Rate</p>
                <p className="text-lg font-bold">{stats.avgWinRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bot Instances */}
      <div className="space-y-4">
        {bots.map((bot) => (
          <Card key={bot.id} className="bg-gradient-card border-border shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{bot.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {bot.symbol} | {bot.strategy} | {bot.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(bot.status) as any} className="flex items-center gap-1">
                    {getStatusIcon(bot.status)}
                    {bot.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteBot(bot.id)}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-semibold">${bot.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily P&L</p>
                  <p className={`font-semibold ${bot.dailyPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${bot.dailyPnL >= 0 ? '+' : ''}{bot.dailyPnL.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trades Today</p>
                  <p className="font-semibold">{bot.dailyTrades}/20</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="font-semibold">{bot.winRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-semibold">{bot.uptime}</p>
                </div>
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={bot.status === 'active'} 
                      onCheckedChange={() => toggleBotStatus(bot.id)}
                      disabled={bot.status === 'paused' && !canActivateBot}
                    />
                    <Button
                      variant={bot.status === 'active' ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => toggleBotStatus(bot.id)}
                      disabled={bot.status === 'paused' && !canActivateBot}
                    >
                      {bot.status === 'active' ? (
                        <>
                          <Square className="w-4 h-4 mr-1" />
                          Pausa
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Starta
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create New Bot Dialog */}
      {showCreateBot && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Skapa Ny Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bot-name">Bot Namn</Label>
                <Input
                  id="bot-name"
                  value={newBotConfig.name}
                  onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                  placeholder="t.ex. Cryonix Gamma"
                />
              </div>
              <div>
                <Label htmlFor="bot-symbol">Handelspar</Label>
                <Select value={newBotConfig.symbol} onValueChange={(value) => setNewBotConfig({...newBotConfig, symbol: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                    <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                    <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
                    <SelectItem value="DOGEUSDT">DOGEUSDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bot-strategy">Strategi</Label>
                <Select value={newBotConfig.strategy} onValueChange={(value) => setNewBotConfig({...newBotConfig, strategy: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grok_sma_hybrid">Grok + SMA Hybrid</SelectItem>
                    <SelectItem value="sma_only">SMA Crossover Only</SelectItem>
                    <SelectItem value="grok_only">Grok Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bot-balance">Initial Balance ($)</Label>
                <Input
                  id="bot-balance"
                  type="number"
                  value={newBotConfig.initialBalance}
                  onChange={(e) => setNewBotConfig({...newBotConfig, initialBalance: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {!canActivateBot && "Bot kommer att starta i pausat läge (max aktiva bots nådd)"}
                {canActivateBot && "Bot kommer att starta automatiskt"}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateBot(false)}>
                  Avbryt
                </Button>
                <Button 
                  onClick={createNewBot}
                  disabled={!newBotConfig.name}
                  className="bg-gradient-primary"
                >
                  Skapa Bot
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Limits Info */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>System Begränsningar:</span>
            </div>
            <span>Max {maxActiveBots} aktiva bots</span>
            <span>Max 4 totala bots</span>
            <span>20 trades/dag per bot</span>
            <span>30% max position size</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiBotManager;