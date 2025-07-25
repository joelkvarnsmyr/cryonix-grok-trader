import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  DollarSign,
  Zap
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: string;
  validation?: {
    status: 'pending' | 'approved' | 'rejected';
    confidence: number;
    reasoning: string;
    recommendation: 'approve' | 'caution' | 'block';
  };
  actionButtons?: string[];
}

interface TradeCommand {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  amount?: number;
  price?: number;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Cryonix Assistant är redo. Du kan ge handelskommandon eller ställa frågor om marknaden.',
      timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: '2',
      type: 'bot',
      content: 'Baserat på aktuell X-sentiment för DOGE (+15% mentions), rekommenderar jag köp av 0.001 BTC worth DOGE. Vill du godkänna?',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      validation: {
        status: 'pending',
        confidence: 78,
        reasoning: 'Stark social media-momentum, RSI 45 (neutral), volym +12%',
        recommendation: 'approve'
      },
      actionButtons: ['Godkänn', 'Avråd', 'Mer info']
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const parseTradeCommand = (input: string): TradeCommand | null => {
    const buyPattern = /(?:köp|buy)\s*(\d*\.?\d*)\s*(\w+)/i;
    const sellPattern = /(?:sälj|sell)\s*(\d*\.?\d*)\s*(\w+)/i;
    
    const buyMatch = input.match(buyPattern);
    const sellMatch = input.match(sellPattern);
    
    if (buyMatch) {
      return {
        action: 'buy',
        amount: parseFloat(buyMatch[1]) || undefined,
        symbol: buyMatch[2].toUpperCase()
      };
    }
    
    if (sellMatch) {
      return {
        action: 'sell',
        amount: parseFloat(sellMatch[1]) || undefined,
        symbol: sellMatch[2].toUpperCase()
      };
    }
    
    return null;
  };

  const simulateGrokValidation = (command: TradeCommand): ChatMessage['validation'] => {
    const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'DOGE'];
    const isValidSymbol = symbols.some(s => command.symbol.includes(s));
    
    if (!isValidSymbol) {
      return {
        status: 'rejected',
        confidence: 95,
        reasoning: 'Symbolen stöds inte. Tillgängliga: BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, DOGE/USDT',
        recommendation: 'block'
      };
    }
    
    const confidence = Math.floor(Math.random() * 40) + 45; // 45-85%
    const isHighRisk = command.amount && command.amount > 0.1;
    
    return {
      status: 'pending',
      confidence,
      reasoning: isHighRisk 
        ? 'Stor position - rekommenderar försiktighet för nybörjare'
        : 'Inom riskparametrar, tekniska indikatorer neutrala',
      recommendation: isHighRisk ? 'caution' : confidence > 65 ? 'approve' : 'caution'
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Parse command if it's a trade command
    const tradeCommand = parseTradeCommand(inputValue);
    
    if (tradeCommand) {
      const validation = simulateGrokValidation(tradeCommand);
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `Kommando parsad: ${tradeCommand.action.toUpperCase()} ${tradeCommand.amount || 'market'} ${tradeCommand.symbol}`,
        timestamp: new Date().toISOString(),
        validation,
        actionButtons: validation.status === 'pending' ? ['Godkänn', 'Avråd'] : undefined
      };
      
      setMessages(prev => [...prev, botResponse]);
    } else {
      // General response for non-trade commands
      const responses = [
        'Marknaden visar blandade signaler. BTC +2.1%, ETH -0.8% senaste timmen.',
        'Aktuell portfölj: 68% USDT, 15% BTC, 10% ETH, 7% övriga. P&L: +3.2% idag.',
        'Risk-status: 🟢 Grönt. 2/10 dagliga trades använda, drawdown 1.2%.',
        'Social sentiment: DOGE trending (+25% mentions), BTC neutral, ETH svagt negativ.'
      ];
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botResponse]);
    }
    
    setIsProcessing(false);
  };

  const handleQuickAction = (action: string, messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.validation) {
        return {
          ...msg,
          validation: {
            ...msg.validation,
            status: action === 'Godkänn' ? 'approved' : 'rejected'
          }
        };
      }
      return msg;
    }));
    
    // Add system response
    const responseMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: action === 'Godkänn' 
        ? '✅ Kommando godkänt och skickat till trading-engine'
        : '❌ Kommando avrådt och inte utfört',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, responseMessage]);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-danger" />;
      default: return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getValidationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'approve': return 'success';
      case 'block': return 'danger';
      default: return 'warning';
    }
  };

  const quickCommands = [
    { label: '📊 Status', command: 'Visa portföljstatus' },
    { label: '💰 Köp BTC', command: 'Köp 0.001 BTC' },
    { label: '📈 Marknad', command: 'Hur ser marknaden ut?' },
    { label: '⚠️ Risk', command: 'Visa riskstatus' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Cryonix Chat Assistant
            <Badge variant="outline" className="ml-auto">
              <Zap className="w-3 h-3 mr-1" />
              Grok-powered
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Area */}
        <Card className="lg:col-span-3 bg-gradient-card border-border shadow-card">
          <CardContent className="p-0">
            {/* Chat Messages */}
            <ScrollArea className="h-96 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type !== 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {message.type === 'bot' ? (
                          <Bot className="w-4 h-4 text-primary" />
                        ) : (
                          <Zap className="w-4 h-4 text-accent" />
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[70%] ${message.type === 'user' ? 'order-1' : ''}`}>
                      <div className={`rounded-lg p-3 ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.type === 'system'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        
                        {/* Validation Info */}
                        {message.validation && (
                          <div className="mt-3 p-2 bg-background/50 rounded border">
                            <div className="flex items-center gap-2 mb-2">
                              {getValidationIcon(message.validation.status)}
                              <span className="text-xs font-medium">
                                Grok Analys ({message.validation.confidence}% confidence)
                              </span>
                              <Badge variant={getValidationColor(message.validation.recommendation) as any} className="text-xs">
                                {message.validation.recommendation === 'approve' ? 'Rekommenderar' : 
                                 message.validation.recommendation === 'block' ? 'Avråder' : 'Försiktighet'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{message.validation.reasoning}</p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        {message.actionButtons && message.validation?.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            {message.actionButtons.map((action) => (
                              <Button
                                key={action}
                                size="sm"
                                variant={action === 'Godkänn' ? 'default' : 'outline'}
                                onClick={() => handleQuickAction(action, message.id)}
                              >
                                {action}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-accent" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <Separator />
            
            {/* Chat Input */}
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Skriv ett kommando (t.ex. 'köp 0.1 ETH') eller ställ en fråga..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputValue.trim() || isProcessing}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Sidebar */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Snabbkommandon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickCommands.map((cmd, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => setInputValue(cmd.command)}
              >
                {cmd.label}
              </Button>
            ))}
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Handelsexempel</h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>• "köp 0.1 BTC"</p>
                <p>• "sälj 50% ETH"</p>
                <p>• "visa portfölj"</p>
                <p>• "hur ser DOGE ut?"</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Status</h4>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Grok AI Aktiv</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Binance Ansluten</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span>Testnet Mode</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;