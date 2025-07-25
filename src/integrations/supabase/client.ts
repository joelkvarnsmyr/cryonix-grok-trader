import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mykiihodfokpskccbvfb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15a2lpaG9kZm9rcHNrY2NidmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODM1OTQsImV4cCI6MjA2OTA1OTU5NH0.qOTSsoIaoSmuqLz_ZFXbA6qDTGnhz86HfEsOPBjOjRc";

console.log('Supabase client: Initializing...', { supabaseUrl, hasKey: !!supabaseAnonKey });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);