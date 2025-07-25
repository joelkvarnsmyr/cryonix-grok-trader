import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitBranch, Workflow, Activity, Shield } from 'lucide-react';

const ProcessFlow = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            Cryonix Process Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="execution" className="space-y-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="execution">Trade Execution</TabsTrigger>
              <TabsTrigger value="data">Data Fetching</TabsTrigger>
              <TabsTrigger value="analysis">Grok Analysis</TabsTrigger>
              <TabsTrigger value="risk">Risk Validation</TabsTrigger>
            </TabsList>

            <TabsContent value="execution">
              <div className="bg-background rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-center">Trade Execution Workflow</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">1</div>
                    <div>
                      <p className="font-medium">Load Configuration</p>
                      <p className="text-muted-foreground">config.yaml → Initialize Components</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-success-foreground font-bold">2</div>
                    <div>
                      <p className="font-medium">Fetch Real-time Data</p>
                      <p className="text-muted-foreground">Binance WebSocket → Market Prices</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold">3</div>
                    <div>
                      <p className="font-medium">Grok Analysis</p>
                      <p className="text-muted-foreground">xAI SDK → Trading Signal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center text-warning-foreground font-bold">4</div>
                    <div>
                      <p className="font-medium">Risk Validation</p>
                      <p className="text-muted-foreground">Check Limits → Validate Trade</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">5</div>
                    <div>
                      <p className="font-medium">Execute & Log</p>
                      <p className="text-muted-foreground">Place Order → Update Backlog</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data">
              <div className="bg-background rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-center">Data Fetching Process</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 text-success">Cache Hit Path</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>→ Check TTL Cache (60s)</li>
                      <li>→ Return Cached Data</li>
                      <li>→ Fast Response</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 text-primary">Cache Miss Path</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>→ Create AsyncClient</li>
                      <li>→ Connect WebSocket</li>
                      <li>→ Validate & Cache</li>
                      <li>→ Return Fresh Data</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis">
              <div className="bg-background rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-center">AI Analysis Engine</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 text-accent">Primary: Grok Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Input:</span>
                        <p>Market data + sentiment</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Process:</span>
                        <p>xAI SDK → JSON Response</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output:</span>
                        <p>BUY/SELL/HOLD + Confidence</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 text-warning">Fallback: Technical Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      If Grok confidence &lt; 50%, fallback to SMA Crossover strategy (10/50 period)
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="risk">
              <div className="bg-background rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-center">Risk Management Engine</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-3 text-warning">Validation Checks</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>✓ Position size ≤ 30% of portfolio</li>
                      <li>✓ Daily trades ≤ 20 per symbol</li>
                      <li>✓ Price/quantity validation</li>
                      <li>✓ Portfolio value assessment</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-3 text-success">Safety Features</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Testnet mode enabled</li>
                      <li>• Async file locking</li>
                      <li>• Trade count persistence</li>
                      <li>• Real-time monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Architecture Overview */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-accent" />
            System Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Core Components</h3>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Data Fetcher (WebSocket)</li>
                <li>• Grok Analyzer (xAI SDK)</li>
                <li>• Risk Validator</li>
                <li>• Trade Executor</li>
                <li>• Backlog Manager</li>
              </ul>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-warning" />
                <h3 className="font-semibold">Risk Controls</h3>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Max Position: 30%</li>
                <li>• Daily Trades: ≤20</li>
                <li>• Drawdown Limit: 5%</li>
                <li>• Testnet Mode</li>
                <li>• Rate Limiting</li>
              </ul>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Workflow className="w-5 h-5 text-success" />
                <h3 className="font-semibold">Integrations</h3>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Binance API/WebSocket</li>
                <li>• xAI Grok-3 Model</li>
                <li>• SMA Crossover Strategy</li>
                <li>• TTL Cache (60s)</li>
                <li>• Async I/O</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessFlow;