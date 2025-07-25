import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TradingDashboard from '@/components/TradingDashboard';
import ProcessFlow from '@/components/ProcessFlow';
import BacktestingDashboard from '@/components/BacktestingDashboard';
import MultiBotManager from '@/components/MultiBotManager';
import KPIDashboard from '@/components/KPIDashboard';
import ConfigurationPanel from '@/components/ConfigurationPanel';
import TradingFlowChart from '@/components/TradingFlowChart';
import ChatInterface from '@/components/ChatInterface';
import { BarChart3, GitBranch, MessageCircle } from 'lucide-react';
import tradingHero from '@/assets/trading-hero.jpg';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative h-96 bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: `url(${tradingHero})` }}
      >
        <div className="absolute inset-0 bg-background/80"></div>
        <div className="relative z-10 text-center space-y-4">
          <h1 className="text-5xl font-bold text-foreground">Cryonix Trading Bot</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced cryptocurrency trading dashboard with real-time analytics and risk management
          </p>
          <div className="flex items-center justify-center gap-2 text-success">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Dashboard Active</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
          <div className="container mx-auto p-6">
            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="bg-muted">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Trading Dashboard
                </TabsTrigger>
                <TabsTrigger value="backtesting" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Backtesting
                </TabsTrigger>
                <TabsTrigger value="multibot" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Multi-Bot Manager
                </TabsTrigger>
                <TabsTrigger value="kpi" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  KPI Dashboard
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Chat Assistant
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Konfiguration
                </TabsTrigger>
                <TabsTrigger value="architecture" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Arkitektur
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <TradingDashboard />
              </TabsContent>

              <TabsContent value="backtesting">
                <BacktestingDashboard />
              </TabsContent>

              <TabsContent value="multibot">
                <MultiBotManager />
              </TabsContent>

              <TabsContent value="kpi">
                <KPIDashboard />
              </TabsContent>

              <TabsContent value="chat">
                <ChatInterface />
              </TabsContent>

              <TabsContent value="config">
                <ConfigurationPanel />
              </TabsContent>

              <TabsContent value="architecture">
                <div className="space-y-6">
                  <ProcessFlow />
                  <TradingFlowChart />
                </div>
              </TabsContent>
            </Tabs>
          </div>
    </div>
  );
};

export default Index;
