import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Shield, 
  Zap, 
  Database, 
  Globe, 
  Key, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface ConfigSection {
  trading: {
    testnet: boolean;
    watchlist: string[];
    maxPositionSize: number;
    maxTradesPerDay: number;
    stopLoss: number;
    takeProfit: number;
    userLevel: string;
  };
  risk: {
    maxDrawdown: number;
    portfolioValue: number;
    anonymizeLogs: boolean;
    useEd25519: boolean;
  };
  integrations: {
    grokModel: string;
    grokEnabled: boolean;
    requestTimeout: number;
    websocketTimeout: number;
    autoRefreshSeconds: number;
  };
  strategies: {
    primary: string;
    smaShortWindow: number;
    smaLongWindow: number;
    rsiPeriod: number;
    grokConfidenceThreshold: number;
  };
  system: {
    multiBotMaxActive: number;
    backlogRetention: number;
    logLevel: string;
    uiEnabled: boolean;
    mermaidEnabled: boolean;
  };
}

const ConfigurationPanel = () => {
  const [hasChanges, setHasChanges] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [lastSaved, setLastSaved] = useState('2025-07-25 14:30:00');

  const [config, setConfig] = useState<ConfigSection>({
    trading: {
      testnet: true,
      watchlist: ['BTCUSDT', 'ETHUSDT'],
      maxPositionSize: 30,
      maxTradesPerDay: 20,
      stopLoss: 2,
      takeProfit: 5,
      userLevel: 'beginner'
    },
    risk: {
      maxDrawdown: 5,
      portfolioValue: 10000,
      anonymizeLogs: true,
      useEd25519: false
    },
    integrations: {
      grokModel: 'grok-3',
      grokEnabled: true,
      requestTimeout: 15,
      websocketTimeout: 1800,
      autoRefreshSeconds: 10
    },
    strategies: {
      primary: 'grok_sma_hybrid',
      smaShortWindow: 10,
      smaLongWindow: 50,
      rsiPeriod: 14,
      grokConfidenceThreshold: 50
    },
    system: {
      multiBotMaxActive: 2,
      backlogRetention: 30,
      logLevel: 'INFO',
      uiEnabled: true,
      mermaidEnabled: true
    }
  });

  const updateConfig = (section: keyof ConfigSection, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const saveConfiguration = async () => {
    // Simulate saving configuration
    setLastSaved(new Date().toLocaleString('sv-SE'));
    setHasChanges(false);
    // In real implementation, this would call API to save config
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    // Simulate connection test
    setTimeout(() => {
      setIsTestingConnection(false);
    }, 2000);
  };

  const resetToDefaults = () => {
    // Reset to default values
    setConfig({
      trading: {
        testnet: true,
        watchlist: ['BTCUSDT'],
        maxPositionSize: 30,
        maxTradesPerDay: 20,
        stopLoss: 2,
        takeProfit: 5,
        userLevel: 'beginner'
      },
      risk: {
        maxDrawdown: 5,
        portfolioValue: 10000,
        anonymizeLogs: true,
        useEd25519: false
      },
      integrations: {
        grokModel: 'grok-3',
        grokEnabled: true,
        requestTimeout: 15,
        websocketTimeout: 1800,
        autoRefreshSeconds: 10
      },
      strategies: {
        primary: 'grok_sma_hybrid',
        smaShortWindow: 10,
        smaLongWindow: 50,
        rsiPeriod: 14,
        grokConfidenceThreshold: 50
      },
      system: {
        multiBotMaxActive: 2,
        backlogRetention: 30,
        logLevel: 'INFO',
        uiEnabled: true,
        mermaidEnabled: true
      }
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Konfiguration</h2>
          <p className="text-muted-foreground">
            Senast sparad: {lastSaved}
            {hasChanges && (
                <Badge variant="secondary" className="ml-2 text-warning">
                  Osparade ändringar
                </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={isTestingConnection}>
            {isTestingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
            Test Anslutning
          </Button>
          <Button 
            onClick={saveConfiguration} 
            disabled={!hasChanges}
            className="bg-gradient-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            Spara Konfiguration
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="trading" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="trading" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Integrationer
          </TabsTrigger>
          <TabsTrigger value="strategies" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Strategier
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Trading Inställningar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="testnet">Testnet Mode</Label>
                    <Switch 
                      id="testnet"
                      checked={config.trading.testnet}
                      onCheckedChange={(value) => updateConfig('trading', 'testnet', value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="userLevel">Användarnivå</Label>
                    <Select 
                      value={config.trading.userLevel} 
                      onValueChange={(value) => updateConfig('trading', 'userLevel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Nybörjare</SelectItem>
                        <SelectItem value="intermediate">Medel</SelectItem>
                        <SelectItem value="advanced">Avancerad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="watchlist">Watchlist (handelspar)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {config.trading.watchlist.map((symbol, index) => (
                        <Badge key={index} variant="secondary">
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      För att lägga till/ta bort handelspar, redigera config.yaml
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxPositionSize">Max Position Size (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.trading.maxPositionSize]}
                        onValueChange={(value) => updateConfig('trading', 'maxPositionSize', value[0])}
                        max={100}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>1%</span>
                        <span className="font-medium">{config.trading.maxPositionSize}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="maxTradesPerDay">Max Trades per Dag</Label>
                    <Input
                      id="maxTradesPerDay"
                      type="number"
                      value={config.trading.maxTradesPerDay}
                      onChange={(e) => updateConfig('trading', 'maxTradesPerDay', Number(e.target.value))}
                      min={1}
                      max={100}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        value={config.trading.stopLoss}
                        onChange={(e) => updateConfig('trading', 'stopLoss', Number(e.target.value))}
                        min={0.1}
                        max={20}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <Label htmlFor="takeProfit">Take Profit (%)</Label>
                      <Input
                        id="takeProfit"
                        type="number"
                        value={config.trading.takeProfit}
                        onChange={(e) => updateConfig('trading', 'takeProfit', Number(e.target.value))}
                        min={0.1}
                        max={50}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-warning" />
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxDrawdown">Max Drawdown (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.risk.maxDrawdown]}
                        onValueChange={(value) => updateConfig('risk', 'maxDrawdown', value[0])}
                        max={50}
                        min={1}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>1%</span>
                        <span className="font-medium text-danger">{config.risk.maxDrawdown}%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="portfolioValue">Portfolio Värde (USDT)</Label>
                    <Input
                      id="portfolioValue"
                      type="number"
                      value={config.risk.portfolioValue}
                      onChange={(e) => updateConfig('risk', 'portfolioValue', Number(e.target.value))}
                      min={100}
                      max={1000000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Fallback värde om API hämtning misslyckas
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="anonymizeLogs">Anonymisera Loggar</Label>
                      <p className="text-sm text-muted-foreground">Dölj känslig data i loggar</p>
                    </div>
                    <Switch 
                      id="anonymizeLogs"
                      checked={config.risk.anonymizeLogs}
                      onCheckedChange={(value) => updateConfig('risk', 'anonymizeLogs', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="useEd25519">Ed25519 Signering</Label>
                      <p className="text-sm text-muted-foreground">Avancerad kryptografisk signering</p>
                    </div>
                    <Switch 
                      id="useEd25519"
                      checked={config.risk.useEd25519}
                      onCheckedChange={(value) => updateConfig('risk', 'useEd25519', value)}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <h4 className="font-semibold">Risk Varningar</h4>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Testnet mode aktiv - inga riktiga pengar används</li>
                      <li>• Max drawdown är inställd på {config.risk.maxDrawdown}%</li>
                      <li>• Loggar anonymiseras för säkerhet</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                API Integrationer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="grokEnabled">Grok AI Aktiverad</Label>
                      <p className="text-sm text-muted-foreground">xAI Grok sentimentanalys</p>
                    </div>
                    <Switch 
                      id="grokEnabled"
                      checked={config.integrations.grokEnabled}
                      onCheckedChange={(value) => updateConfig('integrations', 'grokEnabled', value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="grokModel">Grok Model</Label>
                    <Select 
                      value={config.integrations.grokModel} 
                      onValueChange={(value) => updateConfig('integrations', 'grokModel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grok-1">Grok-1</SelectItem>
                        <SelectItem value="grok-2">Grok-2</SelectItem>
                        <SelectItem value="grok-3">Grok-3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="requestTimeout">API Timeout (sekunder)</Label>
                    <Input
                      id="requestTimeout"
                      type="number"
                      value={config.integrations.requestTimeout}
                      onChange={(e) => updateConfig('integrations', 'requestTimeout', Number(e.target.value))}
                      min={5}
                      max={60}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="websocketTimeout">WebSocket Timeout (sekunder)</Label>
                    <Input
                      id="websocketTimeout"
                      type="number"
                      value={config.integrations.websocketTimeout}
                      onChange={(e) => updateConfig('integrations', 'websocketTimeout', Number(e.target.value))}
                      min={300}
                      max={7200}
                    />
                  </div>

                  <div>
                    <Label htmlFor="autoRefreshSeconds">UI Auto-refresh (sekunder)</Label>
                    <Input
                      id="autoRefreshSeconds"
                      type="number"
                      value={config.integrations.autoRefreshSeconds}
                      onChange={(e) => updateConfig('integrations', 'autoRefreshSeconds', Number(e.target.value))}
                      min={5}
                      max={60}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold">API Status</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Binance API:</span>
                        <Badge variant="default" className="text-success">Ansluten</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>xAI Grok:</span>
                        <Badge variant="default" className="text-success">Aktiv</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>WebSocket:</span>
                        <Badge variant="default" className="text-success">Live</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Trading Strategier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="primaryStrategy">Primär Strategi</Label>
                    <Select 
                      value={config.strategies.primary} 
                      onValueChange={(value) => updateConfig('strategies', 'primary', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grok_sma_hybrid">Grok + SMA Hybrid</SelectItem>
                        <SelectItem value="sma_crossover">SMA Crossover</SelectItem>
                        <SelectItem value="grok_only">Grok Only</SelectItem>
                        <SelectItem value="rsi_macd">RSI + MACD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="grokConfidenceThreshold">Grok Confidence Threshold (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.strategies.grokConfidenceThreshold]}
                        onValueChange={(value) => updateConfig('strategies', 'grokConfidenceThreshold', value[0])}
                        max={100}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>10%</span>
                        <span className="font-medium">{config.strategies.grokConfidenceThreshold}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Under denna nivå används teknisk analys fallback
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smaShortWindow">SMA Kort Period</Label>
                      <Input
                        id="smaShortWindow"
                        type="number"
                        value={config.strategies.smaShortWindow}
                        onChange={(e) => updateConfig('strategies', 'smaShortWindow', Number(e.target.value))}
                        min={3}
                        max={50}
                      />
                    </div>
                    <div>
                      <Label htmlFor="smaLongWindow">SMA Lång Period</Label>
                      <Input
                        id="smaLongWindow"
                        type="number"
                        value={config.strategies.smaLongWindow}
                        onChange={(e) => updateConfig('strategies', 'smaLongWindow', Number(e.target.value))}
                        min={10}
                        max={200}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="rsiPeriod">RSI Period</Label>
                    <Input
                      id="rsiPeriod"
                      type="number"
                      value={config.strategies.rsiPeriod}
                      onChange={(e) => updateConfig('strategies', 'rsiPeriod', Number(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Strategi Info</h4>
                    <p className="text-sm text-muted-foreground">
                      Nuvarande: {config.strategies.primary === 'grok_sma_hybrid' ? 'Grok + SMA Hybrid' : 
                                 config.strategies.primary === 'sma_crossover' ? 'SMA Crossover' : 
                                 config.strategies.primary === 'grok_only' ? 'Grok Only' : 'RSI + MACD'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      SMA: {config.strategies.smaShortWindow}/{config.strategies.smaLongWindow} | 
                      RSI: {config.strategies.rsiPeriod} | 
                      Grok: ≥{config.strategies.grokConfidenceThreshold}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                System Inställningar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="multiBotMaxActive">Max Aktiva Bots</Label>
                    <Input
                      id="multiBotMaxActive"
                      type="number"
                      value={config.system.multiBotMaxActive}
                      onChange={(e) => updateConfig('system', 'multiBotMaxActive', Number(e.target.value))}
                      min={1}
                      max={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="backlogRetention">Backlog Retention (dagar)</Label>
                    <Input
                      id="backlogRetention"
                      type="number"
                      value={config.system.backlogRetention}
                      onChange={(e) => updateConfig('system', 'backlogRetention', Number(e.target.value))}
                      min={1}
                      max={365}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Select 
                      value={config.system.logLevel} 
                      onValueChange={(value) => updateConfig('system', 'logLevel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBUG">DEBUG</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="WARNING">WARNING</SelectItem>
                        <SelectItem value="ERROR">ERROR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="uiEnabled">Streamlit UI Aktiverad</Label>
                      <p className="text-sm text-muted-foreground">Webb-baserat gränssnitt</p>
                    </div>
                    <Switch 
                      id="uiEnabled"
                      checked={config.system.uiEnabled}
                      onCheckedChange={(value) => updateConfig('system', 'uiEnabled', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="mermaidEnabled">Mermaid Processkartor</Label>
                      <p className="text-sm text-muted-foreground">Visuella flödesdiagram</p>
                    </div>
                    <Switch 
                      id="mermaidEnabled"
                      checked={config.system.mermaidEnabled}
                      onCheckedChange={(value) => updateConfig('system', 'mermaidEnabled', value)}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <h4 className="font-semibold">System Status</h4>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>• Python 3.10+ runtime</p>
                      <p>• Poetry dependency manager</p>
                      <p>• Asyncio event loop</p>
                      <p>• {config.system.multiBotMaxActive} max aktiva bots</p>
                      <p>• {config.system.backlogRetention} dagars log retention</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Status */}
      {hasChanges && (
        <Card className="bg-gradient-card border-warning border-2 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="font-medium">Du har osparade ändringar</span>
              </div>
              <Button onClick={saveConfiguration} className="bg-gradient-primary">
                <Save className="w-4 h-4 mr-2" />
                Spara Nu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConfigurationPanel;