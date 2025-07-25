import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  GitBranch,
  MessageCircle,
  Settings,
  TrendingUp,
  Target,
  Bot,
  Activity,
  Zap
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const mainItems = [
  { 
    title: "Trading Dashboard", 
    url: "/", 
    icon: BarChart3,
    description: "Realtidsövervakning"
  },
  { 
    title: "Chat Assistant", 
    url: "/chat", 
    icon: MessageCircle,
    description: "AI-driven handel",
    badge: "Grok"
  },
  { 
    title: "KPI Dashboard", 
    url: "/kpi", 
    icon: TrendingUp,
    description: "Prestationsanalys"
  },
  { 
    title: "Multi-Bot Manager", 
    url: "/multibot", 
    icon: Bot,
    description: "Hantera trading-bots"
  },
];

const analysisItems = [
  { 
    title: "Backtesting", 
    url: "/backtesting", 
    icon: Target,
    description: "Testa strategier"
  },
  { 
    title: "System Arkitektur", 
    url: "/architecture", 
    icon: GitBranch,
    description: "Processflöden"
  },
];

const systemItems = [
  { 
    title: "Konfiguration", 
    url: "/config", 
    icon: Settings,
    description: "Systeminställningar"
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-muted/50 transition-colors";
  };

  const renderMenuItem = (item: typeof mainItems[0]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild className="h-12">
        <NavLink to={item.url} className={getNavClass(item.url)}>
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    <Zap className="w-3 h-3 mr-1" />
                    {item.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {item.description}
              </p>
            </div>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className={collapsed ? "w-16" : "w-72"} collapsible="icon">
      <SidebarContent className="p-0">
        {/* Header */}
        <div className={`p-4 border-b border-border ${collapsed ? "px-2" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg">Cryonix</h2>
                <p className="text-xs text-muted-foreground">Trading Bot v3.1</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {!collapsed && (
          <div className="px-4 py-3 bg-success/5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-success">System Aktiv</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Testnet Mode • 68% Win Rate
            </p>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Huvudfunktioner
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analysis Tools */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Analysverktyg
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {analysisItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {systemItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-border">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium">AI Status</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                    <span>Grok</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                    <span>Binance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}