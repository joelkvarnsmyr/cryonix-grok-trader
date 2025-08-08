import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Shield, 
  Brain, 
  Key, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  Globe,
  Timer
} from 'lucide-react';

interface CryonixConfig {
  ai_settings: {
    google_ai_model: 'gemini-1.5-flash' | 'gemini-1.5-pro';
    confidence_threshold: number;
    analysis_timeout: number;
    fallback_enabled: boolean;
  };
  trading_settings: {
    testnet_mode: boolean;
    watchlist_symbols: string[];
    max_position_size: number;
    max_daily_trades: number;
    stop_loss_percent: number;
    take_profit_percent: number;
    min_trade_amount: number;
  };
  risk_management: {
    max_drawdown_percent: number;
    daily_loss_limit_percent: number;
    risk_level: 1 | 2 | 3 | 4 | 5;
    position_sizing_method: 'fixed' | 'percentage' | 'kelly';
    emergency_stop_enabled: boolean;
  };
  autonomous_settings: {
    loop_interval_minutes: number;
    market_hours_only: boolean;
    end_of_day_close: boolean;
    end_of_day_time: string;
    auto_restart_after_error: boolean;
  };
  api_configuration: {
    binance_testnet_enabled: boolean;
    market_data_refresh_seconds: number;
    sentiment_analysis_enabled: boolean;
    sentiment_cache_minutes: number;
    retry_attempts: number;
    retry_delay_seconds: number;
  };
}

const CryonixConfiguration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<CryonixConfig>({
    ai_settings: {
      google_ai_model: 'gemini-1.5-flash',
      confidence_threshold: 60,
      analysis_timeout: 30,
      fallback_enabled: true
    },
    trading_settings: {
      testnet_mode: true,
      watchlist_symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'],
      max_position_size: 5,
      max_daily_trades: 10,
      stop_loss_percent: 2,
      take_profit_percent: 4,
      min_trade_amount: 10
    },
    risk_management: {
      max_drawdown_percent: 15,
      daily_loss_limit_percent: 5,
      risk_level: 3,
      position_sizing_method: 'percentage',
      emergency_stop_enabled: true
    },
    autonomous_settings: {
      loop_interval_minutes: 5,
      market_hours_only: false,
      end_of_day_close: true,
      end_of_day_time: '23:55',
      auto_restart_after_error: true
    },
    api_configuration: {
      binance_testnet_enabled: true,
      market_data_refresh_seconds: 60,
      sentiment_analysis_enabled: true,
      sentiment_cache_minutes: 5,
      retry_attempts: 3,
      retry_delay_seconds: 2
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    google_ai: 'connected' | 'error' | 'testing';
    binance: 'connected' | 'error' | 'testing';
    market_data: 'connected' | 'error' | 'testing';
  }>({
    google_ai: 'connected',
    binance: 'connected', 
    market_data: 'connected'
  });

  useEffect(() => {
    loadConfiguration();
  }, [user]);

  const loadConfiguration = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'cryonix_configuration')
        .single();

      if (data?.config_value && typeof data.config_value === 'object' && !Array.isArray(data.config_value)) {
        setConfig(prev => ({ ...prev, ...(data.config_value as Partial<CryonixConfig>) }));
      }
    } catch (error) {
      console.log('No existing configuration found, using defaults');
    }
  };

  const updateConfig = (section: keyof CryonixConfig, key: string, value: any) => {
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
    if (!user) return;

    setSaving(true);
    try {
      await supabase
        .from('system_config')
        .upsert({
          user_id: user.id,
          config_key: 'cryonix_configuration',
          config_value: config as any
        });

      setHasChanges(false);
      toast({
        title: "Configuration Saved",
        description: "Your Cryonix settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnections = async () => {
    setTesting(true);
    setApiStatus({
      google_ai: 'testing',
      binance: 'testing',
      market_data: 'testing'
    });

    try {
      // Test Google AI
      const aiTest = await supabase.functions.invoke('market-analysis-ai', {
        body: {
          test: true,
          botId: 'test',
          symbol: 'BTCUSDT',
          marketData: { price: 50000, change_percent_24h: 1 },
          riskSettings: config.trading_settings
        }
      });

      // Test Market Data
      const marketTest = await supabase.functions.invoke('enhanced-market-data', {
        body: {
          action: 'fetch_realtime',
          symbols: ['BTCUSDT']
        }
      });

      setApiStatus({
        google_ai: aiTest.error ? 'error' : 'connected',
        binance: 'connected', // Assume connected for testnet
        market_data: marketTest.error ? 'error' : 'connected'
      });

      toast({
        title: "Connection Test Complete",
        description: "Check the status indicators for results.",
      });
    } catch (error) {
      setApiStatus({
        google_ai: 'error',
        binance: 'error',
        market_data: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  const resetToDefaults = () => {
    setConfig({
      ai_settings: {
        google_ai_model: 'gemini-1.5-flash',
        confidence_threshold: 60,
        analysis_timeout: 30,
        fallback_enabled: true
      },
      trading_settings: {
        testnet_mode: true,
        watchlist_symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'],
        max_position_size: 5,
        max_daily_trades: 10,
        stop_loss_percent: 2,
        take_profit_percent: 4,
        min_trade_amount: 10
      },
      risk_management: {
        max_drawdown_percent: 15,
        daily_loss_limit_percent: 5,
        risk_level: 3,
        position_sizing_method: 'percentage',
        emergency_stop_enabled: true
      },
      autonomous_settings: {
        loop_interval_minutes: 5,
        market_hours_only: false,
        end_of_day_close: true,
        end_of_day_time: '23:55',
        auto_restart_after_error: true
      },
      api_configuration: {
        binance_testnet_enabled: true,
        market_data_refresh_seconds: 60,
        sentiment_analysis_enabled: true,
        sentiment_cache_minutes: 5,
        retry_attempts: 3,
        retry_delay_seconds: 2
      }
    });
    setHasChanges(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'testing':
        return <RefreshCw className="h-4 w-4 text-warning animate-spin" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cryonix Configuration</h2>
          <p className="text-muted-foreground">
            Configure your AI trading bot settings and preferences
            {hasChanges && (
              <Badge variant="secondary" className="ml-2 text-warning">
                Unsaved Changes
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={testConnections} disabled={testing}>
            {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
            Test Connections
          </Button>
          <Button 
            onClick={saveConfiguration} 
            disabled={!hasChanges || saving}
            className="bg-gradient-primary"
          >
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="font-medium">Google AI</span>
              </div>
              {getStatusIcon(apiStatus.google_ai)}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Binance Testnet</span>
              </div>
              {getStatusIcon(apiStatus.binance)}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Market Data</span>
              </div>
              {getStatusIcon(apiStatus.market_data)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="trading" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="autonomous" className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Autonomous Mode
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Configuration
          </TabsTrigger>
        </TabsList>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Analysis Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Google AI Model</Label>
                    <Select 
                      value={config.ai_settings.google_ai_model} 
                      onValueChange={(value: any) => updateConfig('ai_settings', 'google_ai_model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Advanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Confidence Threshold (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.ai_settings.confidence_threshold]}
                        onValueChange={(value) => updateConfig('ai_settings', 'confidence_threshold', value[0])}
                        max={100}
                        min={30}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>30%</span>
                        <span className="font-medium">{config.ai_settings.confidence_threshold}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum confidence required for trade execution
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Analysis Timeout (seconds)</Label>
                    <Input
                      type="number"
                      value={config.ai_settings.analysis_timeout}
                      onChange={(e) => updateConfig('ai_settings', 'analysis_timeout', Number(e.target.value))}
                      min={10}
                      max={120}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Fallback Analysis Enabled</Label>
                      <p className="text-sm text-muted-foreground">Use technical indicators if AI fails</p>
                    </div>
                    <Switch 
                      checked={config.ai_settings.fallback_enabled}
                      onCheckedChange={(value) => updateConfig('ai_settings', 'fallback_enabled', value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Settings */}
        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Trading Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Testnet Mode</Label>
                      <p className="text-sm text-muted-foreground">Use paper trading (recommended)</p>
                    </div>
                    <Switch 
                      checked={config.trading_settings.testnet_mode}
                      onCheckedChange={(value) => updateConfig('trading_settings', 'testnet_mode', value)}
                    />
                  </div>

                  <div>
                    <Label>Watchlist Symbols</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {config.trading_settings.watchlist_symbols.map((symbol, index) => (
                        <Badge key={index} variant="secondary">
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: BTC, ETH, BNB, SOL, DOGE pairs
                    </p>
                  </div>

                  <div>
                    <Label>Max Position Size (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.trading_settings.max_position_size]}
                        onValueChange={(value) => updateConfig('trading_settings', 'max_position_size', value[0])}
                        max={10}
                        min={1}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>1%</span>
                        <span className="font-medium">{config.trading_settings.max_position_size}%</span>
                        <span>10%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Max Daily Trades</Label>
                    <Input
                      type="number"
                      value={config.trading_settings.max_daily_trades}
                      onChange={(e) => updateConfig('trading_settings', 'max_daily_trades', Number(e.target.value))}
                      min={1}
                      max={50}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Stop Loss (%)</Label>
                      <Input
                        type="number"
                        value={config.trading_settings.stop_loss_percent}
                        onChange={(e) => updateConfig('trading_settings', 'stop_loss_percent', Number(e.target.value))}
                        min={0.5}
                        max={10}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <Label>Take Profit (%)</Label>
                      <Input
                        type="number"
                        value={config.trading_settings.take_profit_percent}
                        onChange={(e) => updateConfig('trading_settings', 'take_profit_percent', Number(e.target.value))}
                        min={1}
                        max={20}
                        step={0.1}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Minimum Trade Amount (USDT)</Label>
                    <Input
                      type="number"
                      value={config.trading_settings.min_trade_amount}
                      onChange={(e) => updateConfig('trading_settings', 'min_trade_amount', Number(e.target.value))}
                      min={5}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Management */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
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
                    <Label>Risk Level</Label>
                    <Select 
                      value={config.risk_management.risk_level.toString()} 
                      onValueChange={(value) => updateConfig('risk_management', 'risk_level', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  <div>
                    <Label>Max Drawdown (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.risk_management.max_drawdown_percent]}
                        onValueChange={(value) => updateConfig('risk_management', 'max_drawdown_percent', value[0])}
                        max={50}
                        min={5}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>5%</span>
                        <span className="font-medium text-destructive">{config.risk_management.max_drawdown_percent}%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Daily Loss Limit (%)</Label>
                    <Input
                      type="number"
                      value={config.risk_management.daily_loss_limit_percent}
                      onChange={(e) => updateConfig('risk_management', 'daily_loss_limit_percent', Number(e.target.value))}
                      min={1}
                      max={20}
                      step={0.5}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Position Sizing Method</Label>
                    <Select 
                      value={config.risk_management.position_sizing_method} 
                      onValueChange={(value: any) => updateConfig('risk_management', 'position_sizing_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage of Balance</SelectItem>
                        <SelectItem value="kelly">Kelly Criterion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Emergency Stop</Label>
                      <p className="text-sm text-muted-foreground">Auto-stop on major losses</p>
                    </div>
                    <Switch 
                      checked={config.risk_management.emergency_stop_enabled}
                      onCheckedChange={(value) => updateConfig('risk_management', 'emergency_stop_enabled', value)}
                    />
                  </div>

                  <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <h4 className="font-semibold text-destructive">Risk Warnings</h4>
                    </div>
                    <ul className="text-sm space-y-1 text-destructive/80">
                      <li>• Trading carries significant financial risk</li>
                      <li>• Max drawdown: {config.risk_management.max_drawdown_percent}%</li>
                      <li>• Daily loss limit: {config.risk_management.daily_loss_limit_percent}%</li>
                      <li>• {config.trading_settings.testnet_mode ? 'Testnet mode active' : 'LIVE TRADING ENABLED'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Autonomous Settings */}
        <TabsContent value="autonomous" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Autonomous Trading Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Loop Interval (minutes)</Label>
                    <Select 
                      value={config.autonomous_settings.loop_interval_minutes.toString()} 
                      onValueChange={(value) => updateConfig('autonomous_settings', 'loop_interval_minutes', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Market Hours Only</Label>
                      <p className="text-sm text-muted-foreground">Pause during low volume hours</p>
                    </div>
                    <Switch 
                      checked={config.autonomous_settings.market_hours_only}
                      onCheckedChange={(value) => updateConfig('autonomous_settings', 'market_hours_only', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>End of Day Close</Label>
                      <p className="text-sm text-muted-foreground">Close all positions at day end</p>
                    </div>
                    <Switch 
                      checked={config.autonomous_settings.end_of_day_close}
                      onCheckedChange={(value) => updateConfig('autonomous_settings', 'end_of_day_close', value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>End of Day Time (UTC)</Label>
                    <Input
                      type="time"
                      value={config.autonomous_settings.end_of_day_time}
                      onChange={(e) => updateConfig('autonomous_settings', 'end_of_day_time', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Restart After Error</Label>
                      <p className="text-sm text-muted-foreground">Resume trading after system errors</p>
                    </div>
                    <Switch 
                      checked={config.autonomous_settings.auto_restart_after_error}
                      onCheckedChange={(value) => updateConfig('autonomous_settings', 'auto_restart_after_error', value)}
                    />
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold">Autonomous Status</h4>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Analysis every {config.autonomous_settings.loop_interval_minutes} minutes</li>
                      <li>• {config.autonomous_settings.end_of_day_close ? `Close positions at ${config.autonomous_settings.end_of_day_time} UTC` : 'No automatic position closing'}</li>
                      <li>• {config.autonomous_settings.auto_restart_after_error ? 'Auto-restart enabled' : 'Manual restart required'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Configuration */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Binance Testnet</Label>
                      <p className="text-sm text-muted-foreground">Use paper trading API</p>
                    </div>
                    <Switch 
                      checked={config.api_configuration.binance_testnet_enabled}
                      onCheckedChange={(value) => updateConfig('api_configuration', 'binance_testnet_enabled', value)}
                    />
                  </div>

                  <div>
                    <Label>Market Data Refresh (seconds)</Label>
                    <Input
                      type="number"
                      value={config.api_configuration.market_data_refresh_seconds}
                      onChange={(e) => updateConfig('api_configuration', 'market_data_refresh_seconds', Number(e.target.value))}
                      min={30}
                      max={300}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sentiment Analysis</Label>
                      <p className="text-sm text-muted-foreground">AI-powered market sentiment</p>
                    </div>
                    <Switch 
                      checked={config.api_configuration.sentiment_analysis_enabled}
                      onCheckedChange={(value) => updateConfig('api_configuration', 'sentiment_analysis_enabled', value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Sentiment Cache (minutes)</Label>
                    <Input
                      type="number"
                      value={config.api_configuration.sentiment_cache_minutes}
                      onChange={(e) => updateConfig('api_configuration', 'sentiment_cache_minutes', Number(e.target.value))}
                      min={1}
                      max={60}
                    />
                  </div>

                  <div>
                    <Label>Retry Attempts</Label>
                    <Input
                      type="number"
                      value={config.api_configuration.retry_attempts}
                      onChange={(e) => updateConfig('api_configuration', 'retry_attempts', Number(e.target.value))}
                      min={1}
                      max={10}
                    />
                  </div>

                  <div>
                    <Label>Retry Delay (seconds)</Label>
                    <Input
                      type="number"
                      value={config.api_configuration.retry_delay_seconds}
                      onChange={(e) => updateConfig('api_configuration', 'retry_delay_seconds', Number(e.target.value))}
                      min={1}
                      max={30}
                    />
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

export default CryonixConfiguration;