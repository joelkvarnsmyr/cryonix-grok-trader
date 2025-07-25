import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TradingFlowChart = () => {
  const initialNodes: Node[] = useMemo(() => [
    // Configuration Layer
    {
      id: 'config',
      type: 'input',
      position: { x: 50, y: 0 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold text-primary">Configuration</div>
            <div className="text-xs text-muted-foreground">config.yaml + .env</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--primary))', 
        color: 'hsl(var(--primary-foreground))',
        border: '1px solid hsl(var(--primary))',
        borderRadius: '8px',
        width: 160
      }
    },

    // Data Layer
    {
      id: 'websocket',
      position: { x: 300, y: 100 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">WebSocket Data</div>
            <div className="text-xs text-muted-foreground">Binance Real-time</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--success))', 
        color: 'hsl(var(--success-foreground))',
        border: '1px solid hsl(var(--success))',
        borderRadius: '8px',
        width: 140
      }
    },

    {
      id: 'cache',
      position: { x: 500, y: 100 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Browser Cache</div>
            <div className="text-xs text-muted-foreground">Local Storage</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--accent))', 
        color: 'hsl(var(--accent-foreground))',
        border: '1px solid hsl(var(--accent))',
        borderRadius: '8px',
        width: 120
      }
    },

    // Analysis Layer
    {
      id: 'grok',
      position: { x: 150, y: 220 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Grok Analyzer</div>
            <div className="text-xs text-muted-foreground">xAI SDK</div>
            <div className="text-xs text-success">Confidence ≥50%</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--accent))', 
        color: 'hsl(var(--accent-foreground))',
        border: '1px solid hsl(var(--accent))',
        borderRadius: '8px',
        width: 140
      }
    },

    {
      id: 'technical',
      position: { x: 350, y: 220 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Technical Analysis</div>
            <div className="text-xs text-muted-foreground">SMA Crossover</div>
            <div className="text-xs text-warning">Fallback &lt;50%</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--warning))', 
        color: 'hsl(var(--warning-foreground))',
        border: '1px solid hsl(var(--warning))',
        borderRadius: '8px',
        width: 140
      }
    },

    // Decision Node
    {
      id: 'decision',
      position: { x: 250, y: 350 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Signal Decision</div>
            <div className="text-xs text-muted-foreground">BUY/SELL/HOLD</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--muted))', 
        color: 'hsl(var(--foreground))',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '12px',
        width: 140
      }
    },

    // Risk Layer
    {
      id: 'risk',
      position: { x: 50, y: 480 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Risk Validator</div>
            <div className="text-xs text-muted-foreground">Position & Limits</div>
            <div className="text-xs text-danger">Max 30% | 20 trades</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--danger))', 
        color: 'hsl(var(--danger-foreground))',
        border: '1px solid hsl(var(--danger))',
        borderRadius: '8px',
        width: 160
      }
    },

    // Execution Layer
    {
      id: 'executor',
      position: { x: 300, y: 480 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Trade Executor</div>
            <div className="text-xs text-muted-foreground">Binance API</div>
            <div className="text-xs text-primary">REST + WebSocket</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--primary))', 
        color: 'hsl(var(--primary-foreground))',
        border: '1px solid hsl(var(--primary))',
        borderRadius: '8px',
        width: 140
      }
    },

    // Storage Layer
    {
      id: 'backlog',
      position: { x: 500, y: 480 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Backlog Manager</div>
            <div className="text-xs text-muted-foreground">Local Storage</div>
            <div className="text-xs text-success">Real-time Updates</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--secondary))', 
        color: 'hsl(var(--secondary-foreground))',
        border: '1px solid hsl(var(--secondary))',
        borderRadius: '8px',
        width: 140
      }
    },

    // UI Layer
    {
      id: 'ui',
      type: 'output',
      position: { x: 300, y: 600 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold text-success">Web Dashboard</div>
            <div className="text-xs text-muted-foreground">React Real-time UI</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--success))', 
        color: 'hsl(var(--success-foreground))',
        border: '1px solid hsl(var(--success))',
        borderRadius: '8px',
        width: 160
      }
    },

    // Multi-bot support
    {
      id: 'multibot',
      position: { x: 700, y: 350 },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold">Multi-Bot Manager</div>
            <div className="text-xs text-muted-foreground">Max 2 Active</div>
            <div className="text-xs text-warning">Load Balancing</div>
          </div>
        ) 
      },
      style: { 
        background: 'hsl(var(--muted))', 
        color: 'hsl(var(--foreground))',
        border: '2px dashed hsl(var(--primary))',
        borderRadius: '8px',
        width: 140
      }
    }
  ], []);

  const initialEdges: Edge[] = useMemo(() => [
    // Configuration flow
    {
      id: 'config-websocket',
      source: 'config',
      target: 'websocket',
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'hsl(var(--primary))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }
    },
    
    // Data flow
    {
      id: 'websocket-cache',
      source: 'websocket',
      target: 'cache',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--success))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--success))' }
    },
    
    {
      id: 'cache-grok',
      source: 'cache',
      target: 'grok',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--accent))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--accent))' }
    },
    
    {
      id: 'cache-technical',
      source: 'cache',
      target: 'technical',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--warning))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--warning))' }
    },

    // Analysis to decision
    {
      id: 'grok-decision',
      source: 'grok',
      target: 'decision',
      type: 'smoothstep',
      label: 'High Confidence',
      style: { stroke: 'hsl(var(--accent))', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--accent))' }
    },
    
    {
      id: 'technical-decision',
      source: 'technical',
      target: 'decision',
      type: 'smoothstep',
      label: 'Fallback',
      style: { stroke: 'hsl(var(--warning))', strokeDasharray: '5,5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--warning))' }
    },

    // Decision to execution
    {
      id: 'decision-risk',
      source: 'decision',
      target: 'risk',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--danger))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--danger))' }
    },
    
    {
      id: 'risk-executor',
      source: 'risk',
      target: 'executor',
      type: 'smoothstep',
      label: 'Valid Trade',
      style: { stroke: 'hsl(var(--primary))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }
    },

    // Logging and UI
    {
      id: 'executor-backlog',
      source: 'executor',
      target: 'backlog',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--secondary))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--secondary))' }
    },
    
    {
      id: 'backlog-ui',
      source: 'backlog',
      target: 'ui',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--success))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--success))' }
    },

    // Multi-bot connections
    {
      id: 'decision-multibot',
      source: 'decision',
      target: 'multibot',
      type: 'smoothstep',
      label: 'Load Balance',
      style: { stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3,3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--muted-foreground))' }
    },
    
    {
      id: 'multibot-executor',
      source: 'multibot',
      target: 'executor',
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3,3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--muted-foreground))' }
    }
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const proOptions = { hideAttribution: true };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Komponenter</p>
                <p className="text-lg font-bold">11</p>
              </div>
              <Badge variant="default" className="text-primary">Modulär</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Flow</p>
                <p className="text-lg font-bold">Asynkron</p>
              </div>
              <Badge variant="default" className="text-success">Non-blocking</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fallback</p>
                <p className="text-lg font-bold">TA Strategy</p>
              </div>
              <Badge variant="secondary" className="text-warning">SMA Crossover</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Multi-Bot</p>
                <p className="text-lg font-bold">2 Max</p>
              </div>
              <Badge variant="secondary">Load Balanced</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>Cryonix System Architecture Flow</CardTitle>
          <p className="text-sm text-muted-foreground">
            Interaktiv visualisering av systemkomponenter och dataflöde
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[700px] w-full bg-background rounded-lg border border-border">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              proOptions={proOptions}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls className="bg-card border border-border" />
              <MiniMap 
                className="bg-card border border-border" 
                nodeColor={(node) => {
                  switch (node.type) {
                    case 'input': return 'hsl(var(--primary))';
                    case 'output': return 'hsl(var(--success))';
                    default: return 'hsl(var(--muted))';
                  }
                }}
              />
              <Background color="hsl(var(--muted-foreground))" gap={16} />
            </ReactFlow>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-primary">Data Layer</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• WebSocket real-time prices</li>
                <li>• Browser Cache</li>
                <li>• Real-time React updates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-accent">Analysis Layer</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• xAI Grok sentiment analysis</li>
                <li>• Technical indicators (SMA)</li>
                <li>• Confidence-based fallback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-success">Execution Layer</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Risk validation</li>
                <li>• Multi-bot management</li>
                <li>• Trade execution & logging</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingFlowChart;