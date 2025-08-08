import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { performSecureSignIn, performSecureSignUp, cleanupAuthState } from '@/lib/authUtils';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  console.log('Auth page: Component initializing...');
  
  const { user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [isResetRequest, setIsResetRequest] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  console.log('Auth page: State initialized', { user: !!user, authLoading, isSignUp });

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      console.log('Auth: User already authenticated, redirecting...');
      window.location.href = '/';
    }
  }, [user, authLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      setIsPasswordReset(true);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true);
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log(`Auth: Starting ${isSignUp ? 'sign up' : 'sign in'} for:`, email);

    try {
      if (isSignUp) {
        const { data, error } = await performSecureSignUp(email, password);

        if (error) throw error;

        if (data.user && !data.session) {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link to complete registration.",
          });
        } else {
          toast({
            title: "Welcome!",
            description: "Account created successfully.",
          });
        }
      } else {
        const { data, error } = await performSecureSignIn(email, password);

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
      }
    } catch (error: any) {
      console.error('Auth: Authentication error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Valideringsfel",
        description: "Ange din e-postadress",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      toast({
        title: "E-post skickat",
        description: "Vi har skickat en länk för att återställa ditt lösenord.",
      });
      setIsResetRequest(false);
    } catch (error: any) {
      console.error('Auth: Reset error:', error);
      toast({
        title: "Fel vid återställning",
        description: error.message || "Ett oväntat fel inträffade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Valideringsfel",
        description: "Lösenordet måste vara minst 6 tecken",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Valideringsfel",
        description: "Lösenorden matchar inte",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({
        title: "Lösenord uppdaterat",
        description: "Ditt lösenord har uppdaterats.",
      });
      // Clean URL and redirect
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = '/';
    } catch (error: any) {
      console.error('Auth: Update password error:', error);
      toast({
        title: "Fel",
        description: error.message || "Ett oväntat fel inträffade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <span className="mt-2 block">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSignUp 
              ? 'Create your trading account to get started' 
              : 'Sign in to access your trading dashboard'
            }
          </p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || authLoading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </span>
            ) : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;