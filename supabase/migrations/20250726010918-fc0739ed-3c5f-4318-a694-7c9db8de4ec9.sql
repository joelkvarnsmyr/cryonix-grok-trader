-- Fix function search path security issues
CREATE OR REPLACE FUNCTION cron_schedule(job_name text, cron text, command text)
RETURNS void AS $$
BEGIN
  PERFORM cron.schedule(job_name, cron, command);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION cron_unschedule(job_name text)
RETURNS void AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';