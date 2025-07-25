import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { performSecureSignOut } from '@/lib/authUtils';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Setting up auth listeners...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth: Auth state change:', { event, session: !!session, user: !!session?.user });
        
        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('useAuth: User signed in successfully');
          // Defer any additional data loading to prevent deadlocks
          setTimeout(() => {
            // Any additional user data loading can go here
            console.log('useAuth: Ready to load user data');
          }, 0);
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('useAuth: User signed out');
          setUser(null);
          setSession(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    console.log('useAuth: Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('useAuth: Got session:', { session: !!session, user: !!session?.user, error });
      
      if (error) {
        console.error('useAuth: Error getting session:', error);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('useAuth: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('useAuth: Initiating sign out...');
    await performSecureSignOut();
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user && !!session
  };
};