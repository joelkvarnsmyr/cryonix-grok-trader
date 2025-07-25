import { supabase } from '@/integrations/supabase/client';

export const cleanupAuthState = () => {
  console.log('Auth cleanup: Starting auth state cleanup...');
  
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Auth cleanup: Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log('Auth cleanup: Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      }
    });
  }
  
  console.log('Auth cleanup: Cleanup completed');
};

export const performSecureSignOut = async () => {
  console.log('Auth: Starting secure sign out...');
  
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Auth: Global sign out successful');
    } catch (err) {
      console.log('Auth: Global sign out failed, continuing anyway:', err);
    }
    
    // Force page reload for a clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('Auth: Error during sign out:', error);
    // Force reload anyway
    window.location.href = '/auth';
  }
};

export const performSecureSignIn = async (email: string, password: string) => {
  console.log('Auth: Starting secure sign in for:', email);
  
  try {
    // Clean up existing state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Auth: Cleared existing sessions');
    } catch (err) {
      console.log('Auth: No existing sessions to clear, continuing...');
    }
    
    // Sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      console.log('Auth: Sign in successful, redirecting...');
      // Force page reload to ensure clean state
      window.location.href = '/';
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Auth: Sign in error:', error);
    return { data: null, error };
  }
};

export const performSecureSignUp = async (email: string, password: string) => {
  console.log('Auth: Starting secure sign up for:', email);
  
  try {
    // Clean up existing state first
    cleanupAuthState();
    
    // Sign up with email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Auth: Sign up error:', error);
    return { data: null, error };
  }
};