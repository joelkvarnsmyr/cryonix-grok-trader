import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Send, 
  MessageSquare, 
  Brain,
  TrendingUp,
  Shield,
  Target,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AnalysisResult {
  analysis: string;
  analysisType: string;
  symbol?: string;
  timestamp: string;
}

const AITradingAssistant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  const sendChatMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('trading-assistant', {
        body: {
          message: currentMessage,
          conversationId: conversationId
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      toast({
        title: "Response received",
        description: "CryonixAI has analyzed your query",
      });

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

  const requestAnalysis = async (analysisType: string) => {
    setAnalysisLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-market-analysis', {
        body: {
          symbol: selectedSymbol,
          analysisType: analysisType,
          timeframe: '24h'
        }
      });

      if (error) throw error;

      const newAnalysis: AnalysisResult = {
        analysis: data.analysis,
        analysisType: data.analysisType,
        symbol: data.symbol,
        timestamp: data.timestamp
      };

      setAnalysisResults(prev => [newAnalysis, ...prev]);

      toast({
        title: "Analysis complete",
        description: `${analysisType.replace('_', ' ')} analysis generated successfully`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getAnalysisIcon = (type: string) => {
    switch (type) {
      case 'market_overview': return TrendingUp;
      case 'technical_analysis': return Target;
      case 'risk_assessment': return Shield;
      case 'strategy_recommendation': return Brain;
      default: return MessageSquare;
    }
  };

  const formatAnalysisType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">CryonixAI Trading Assistant</h1>
          <p className="text-muted-foreground">AI-powered market analysis and trading guidance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Trading Chat
            </CardTitle>
            <CardDescription>
              Ask questions about trading strategies, market analysis, or get personalized advice
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg bg-muted/10">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with CryonixAI</p>
                  <p className="text-sm">Ask about market trends, trading strategies, or get personalized advice</p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">CryonixAI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask about market trends, trading strategies, or get advice..."
                className="flex-1"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />
              <Button 
                onClick={sendChatMessage} 
                disabled={!currentMessage.trim() || loading}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Tools */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Market Analysis
            </CardTitle>
            <CardDescription>
              Generate detailed AI-powered analysis for specific trading pairs
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Analysis Controls */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Trading Pair</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
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

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestAnalysis('market_overview')}
                  disabled={analysisLoading}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Market Overview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestAnalysis('technical_analysis')}
                  disabled={analysisLoading}
                  className="gap-2"
                >
                  <Target className="h-4 w-4" />
                  Technical Analysis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestAnalysis('risk_assessment')}
                  disabled={analysisLoading}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Risk Assessment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestAnalysis('strategy_recommendation')}
                  disabled={analysisLoading}
                  className="gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Strategy Advice
                </Button>
              </div>

              {analysisLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Generating AI analysis...</span>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {analysisResults.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No analysis generated yet</p>
                  <p className="text-sm">Click any analysis button above to get started</p>
                </div>
              ) : (
                analysisResults.map((result, index) => {
                  const Icon = getAnalysisIcon(result.analysisType);
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{formatAnalysisType(result.analysisType)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.symbol && (
                            <Badge variant="secondary">{result.symbol}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">
                        {result.analysis}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AITradingAssistant;