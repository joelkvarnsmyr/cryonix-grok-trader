-- Create trading bots table
CREATE TABLE public.trading_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'paused', 'stopped')),
  initial_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  current_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  daily_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  daily_trades INTEGER NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_drawdown DECIMAL(5,2) NOT NULL DEFAULT 0,
  uptime_hours INTEGER NOT NULL DEFAULT 0,
  version TEXT NOT NULL DEFAULT '1.0.0',
  risk_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_bots ENABLE ROW LEVEL SECURITY;

-- Create policies for trading_bots
CREATE POLICY "Users can view their own bots" 
ON public.trading_bots 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bots" 
ON public.trading_bots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots" 
ON public.trading_bots 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots" 
ON public.trading_bots 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id UUID REFERENCES public.trading_bots(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  total_value DECIMAL(20,8) NOT NULL,
  confidence DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  exchange_order_id TEXT,
  fees DECIMAL(20,8) DEFAULT 0,
  pnl DECIMAL(20,8) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trades
CREATE POLICY "Users can view their own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades" 
ON public.trades 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
ON public.trades 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create market_data table for storing real-time market data
CREATE TABLE public.market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  change_24h DECIMAL(20,8) NOT NULL,
  change_percent_24h DECIMAL(5,2) NOT NULL,
  volume_24h DECIMAL(20,8) NOT NULL,
  high_24h DECIMAL(20,8) NOT NULL,
  low_24h DECIMAL(20,8) NOT NULL,
  market_cap DECIMAL(20,2),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read access for market data)
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- Create policy for market data (readable by all authenticated users)
CREATE POLICY "Market data is readable by all authenticated users" 
ON public.market_data 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create system_config table for bot configurations
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, config_key)
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for system_config
CREATE POLICY "Users can manage their own config" 
ON public.system_config 
FOR ALL 
USING (auth.uid() = user_id);

-- Create performance_metrics table for KPI tracking
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id UUID REFERENCES public.trading_bots(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  daily_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  profit_factor DECIMAL(10,4) NOT NULL DEFAULT 0,
  max_drawdown DECIMAL(5,2) NOT NULL DEFAULT 0,
  sharpe_ratio DECIMAL(10,4),
  volatility DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bot_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for performance_metrics
CREATE POLICY "Users can view their own metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" 
ON public.performance_metrics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_trading_bots_updated_at
  BEFORE UPDATE ON public.trading_bots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_trading_bots_user_id ON public.trading_bots(user_id);
CREATE INDEX idx_trading_bots_status ON public.trading_bots(status);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_bot_id ON public.trades(bot_id);
CREATE INDEX idx_trades_symbol ON public.trades(symbol);
CREATE INDEX idx_trades_created_at ON public.trades(created_at);
CREATE INDEX idx_market_data_symbol ON public.market_data(symbol);
CREATE INDEX idx_market_data_timestamp ON public.market_data(timestamp);
CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_bot_id ON public.performance_metrics(bot_id);
CREATE INDEX idx_performance_metrics_date ON public.performance_metrics(metric_date);

-- Enable realtime for live updates
ALTER TABLE public.trading_bots REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.market_data REPLICA IDENTITY FULL;
ALTER TABLE public.performance_metrics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_bots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_metrics;