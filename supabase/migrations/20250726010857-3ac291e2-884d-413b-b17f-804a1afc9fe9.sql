-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create database functions for cron management
CREATE OR REPLACE FUNCTION cron_schedule(job_name text, cron text, command text)
RETURNS void AS $$
BEGIN
  PERFORM cron.schedule(job_name, cron, command);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cron_unschedule(job_name text)
RETURNS void AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;