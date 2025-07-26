-- Create bot_activities table for real-time activity logging
CREATE TABLE public.bot_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id UUID NOT NULL REFERENCES public.trading_bots(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('trade_signal', 'order_placed', 'order_filled', 'order_cancelled', 'error', 'status_change', 'analysis')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'info' CHECK (status IN ('info', 'success', 'warning', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for bot activities
CREATE POLICY "Users can view their own bot activities" 
ON public.bot_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bot activities" 
ON public.bot_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_bot_activities_bot_id_created_at ON public.bot_activities(bot_id, created_at DESC);
CREATE INDEX idx_bot_activities_user_id_created_at ON public.bot_activities(user_id, created_at DESC);

-- Add realtime publication for bot activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_activities;

-- Add replica identity for realtime updates
ALTER TABLE public.bot_activities REPLICA IDENTITY FULL;