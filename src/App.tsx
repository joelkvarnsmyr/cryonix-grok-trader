import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TestIndex from "./pages/TestIndex";
import Chat from "./pages/Chat";
import KPI from "./pages/KPI";
import MultiBot from "./pages/MultiBot";
import Backtesting from "./pages/Backtesting";
import Config from "./pages/Config";
import Architecture from "./pages/Architecture";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

console.log('App.tsx: Creating QueryClient...');
const queryClient = new QueryClient();

const App = () => {
  console.log('App.tsx: Rendering App component...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TestIndex />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/kpi" element={<KPI />} />
            <Route path="/multibot" element={<MultiBot />} />
            <Route path="/backtesting" element={<Backtesting />} />
            <Route path="/config" element={<Config />} />
            <Route path="/architecture" element={<Architecture />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
