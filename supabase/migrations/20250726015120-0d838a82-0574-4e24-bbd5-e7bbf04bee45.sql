-- Initialize wallet balance för botten (TESTNET setup)
INSERT INTO public.wallet_balances (user_id, bot_id, currency, available_balance, total_balance, reserved_balance)
VALUES (
  '5ffe32cb-9773-42f2-a1be-90c5a5051f2e', 
  '0f6465a6-c877-4a76-948f-f90b79194b24', 
  'USDT', 
  1000.00, 
  1000.00, 
  0.00
) ON CONFLICT (user_id, bot_id, currency) DO UPDATE SET
  available_balance = 1000.00,
  total_balance = 1000.00,
  reserved_balance = 0.00,
  last_updated = now();

-- Create function to initialize new bot with starting balance
CREATE OR REPLACE FUNCTION public.initialize_bot_portfolio(
  p_user_id UUID,
  p_bot_id UUID,
  p_starting_balance NUMERIC DEFAULT 1000.00
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert or update wallet balance
  INSERT INTO public.wallet_balances (user_id, bot_id, currency, available_balance, total_balance, reserved_balance)
  VALUES (p_user_id, p_bot_id, 'USDT', p_starting_balance, p_starting_balance, 0.00)
  ON CONFLICT (user_id, bot_id, currency) DO UPDATE SET
    available_balance = p_starting_balance,
    total_balance = p_starting_balance,
    reserved_balance = 0.00,
    last_updated = now();
    
  -- Log initialization
  INSERT INTO public.bot_activities (user_id, bot_id, activity_type, title, description, status, data)
  VALUES (
    p_user_id,
    p_bot_id,
    'initialization',
    'Bot Portfolio Initialized',
    'Starting balance set to $' || p_starting_balance::text || ' USDT on TESTNET',
    'success',
    jsonb_build_object(
      'starting_balance', p_starting_balance,
      'currency', 'USDT',
      'environment', 'TESTNET'
    )
  );
END;
$$;