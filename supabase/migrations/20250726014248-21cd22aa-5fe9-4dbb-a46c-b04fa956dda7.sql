-- Create portfolio holdings table to track user's current positions
CREATE TABLE public.portfolio_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id UUID,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own holdings" 
ON public.portfolio_holdings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings" 
ON public.portfolio_holdings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" 
ON public.portfolio_holdings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" 
ON public.portfolio_holdings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create wallet balances table for available funds
CREATE TABLE public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id UUID,
  currency TEXT NOT NULL DEFAULT 'USDT',
  available_balance NUMERIC NOT NULL DEFAULT 0,
  total_balance NUMERIC NOT NULL DEFAULT 0,
  reserved_balance NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bot_id, currency)
);

-- Enable RLS
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for wallet balances
CREATE POLICY "Users can view their own wallet balances" 
ON public.wallet_balances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet balances" 
ON public.wallet_balances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet balances" 
ON public.wallet_balances 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update portfolio holdings after trades
CREATE OR REPLACE FUNCTION public.update_portfolio_after_trade()
RETURNS TRIGGER AS $$
DECLARE
  current_holding RECORD;
  new_quantity NUMERIC;
  new_avg_price NUMERIC;
BEGIN
  -- Only process executed trades
  IF NEW.status = 'executed' AND OLD.status != 'executed' THEN
    -- Get current holding
    SELECT * INTO current_holding 
    FROM portfolio_holdings 
    WHERE user_id = NEW.user_id 
      AND symbol = NEW.symbol 
      AND (bot_id = NEW.bot_id OR (bot_id IS NULL AND NEW.bot_id IS NULL));
    
    IF NEW.action = 'buy' THEN
      IF current_holding IS NULL THEN
        -- New position
        INSERT INTO portfolio_holdings (user_id, bot_id, symbol, quantity, avg_buy_price, current_value)
        VALUES (NEW.user_id, NEW.bot_id, NEW.symbol, NEW.quantity, NEW.price, NEW.total_value);
      ELSE
        -- Add to existing position
        new_quantity := current_holding.quantity + NEW.quantity;
        new_avg_price := ((current_holding.quantity * current_holding.avg_buy_price) + NEW.total_value) / new_quantity;
        
        UPDATE portfolio_holdings 
        SET 
          quantity = new_quantity,
          avg_buy_price = new_avg_price,
          current_value = new_quantity * NEW.price,
          last_updated = now()
        WHERE id = current_holding.id;
      END IF;
      
      -- Update wallet balance (subtract spent amount)
      UPDATE wallet_balances 
      SET 
        available_balance = available_balance - NEW.total_value - COALESCE(NEW.fees, 0),
        last_updated = now()
      WHERE user_id = NEW.user_id 
        AND (bot_id = NEW.bot_id OR (bot_id IS NULL AND NEW.bot_id IS NULL))
        AND currency = 'USDT';
        
    ELSIF NEW.action = 'sell' AND current_holding IS NOT NULL THEN
      -- Reduce position
      new_quantity := current_holding.quantity - NEW.quantity;
      
      IF new_quantity <= 0 THEN
        -- Close position completely
        DELETE FROM portfolio_holdings WHERE id = current_holding.id;
      ELSE
        -- Reduce position
        UPDATE portfolio_holdings 
        SET 
          quantity = new_quantity,
          current_value = new_quantity * NEW.price,
          last_updated = now()
        WHERE id = current_holding.id;
      END IF;
      
      -- Update wallet balance (add received amount)
      UPDATE wallet_balances 
      SET 
        available_balance = available_balance + NEW.total_value - COALESCE(NEW.fees, 0),
        last_updated = now()
      WHERE user_id = NEW.user_id 
        AND (bot_id = NEW.bot_id OR (bot_id IS NULL AND NEW.bot_id IS NULL))
        AND currency = 'USDT';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for portfolio updates
CREATE TRIGGER update_portfolio_after_trade_trigger
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_after_trade();

-- Create function to get portfolio summary
CREATE OR REPLACE FUNCTION public.get_portfolio_summary(p_user_id UUID, p_bot_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_value NUMERIC,
  available_cash NUMERIC,
  total_unrealized_pnl NUMERIC,
  position_count INTEGER,
  largest_position_symbol TEXT,
  largest_position_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH portfolio_data AS (
    SELECT 
      COALESCE(SUM(h.current_value), 0) as portfolio_value,
      COALESCE(SUM(h.unrealized_pnl), 0) as total_pnl,
      COUNT(h.id) as positions,
      COALESCE(w.available_balance, 0) as cash
    FROM portfolio_holdings h
    FULL OUTER JOIN wallet_balances w ON w.user_id = h.user_id 
      AND (w.bot_id = h.bot_id OR (w.bot_id IS NULL AND h.bot_id IS NULL))
      AND w.currency = 'USDT'
    WHERE (h.user_id = p_user_id OR w.user_id = p_user_id)
      AND (p_bot_id IS NULL OR h.bot_id = p_bot_id OR w.bot_id = p_bot_id)
  ),
  largest_pos AS (
    SELECT 
      h.symbol,
      h.current_value,
      (h.current_value / NULLIF((SELECT portfolio_value + cash FROM portfolio_data), 0)) * 100 as percentage
    FROM portfolio_holdings h
    WHERE h.user_id = p_user_id 
      AND (p_bot_id IS NULL OR h.bot_id = p_bot_id)
    ORDER BY h.current_value DESC
    LIMIT 1
  )
  SELECT 
    pd.portfolio_value,
    pd.cash,
    pd.total_pnl,
    pd.positions::INTEGER,
    lp.symbol,
    lp.percentage
  FROM portfolio_data pd
  LEFT JOIN largest_pos lp ON true;
END;
$$ LANGUAGE plpgsql;