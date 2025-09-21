import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    const getSession = async () => {
      try {
        console.log('AuthContext - Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext - Error getting session:', error);
          setUser(null);
        } else {
          console.log('AuthContext - Session retrieved:', session?.user?.id ? 'User logged in' : 'No user');
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('AuthContext - Unexpected error getting session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        console.log('Session data:', session);
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in successfully:', session.user.id);
            setUser(session.user);
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('Token refreshed for user:', session.user.id);
            setUser(session.user);
          } else {
            console.log('Other auth event:', event);
            setUser(session?.user ?? null);
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext - signIn called with email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('AuthContext - signIn result:', { data, error });
      return { error };
    } catch (err) {
      console.error('AuthContext - signIn error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    console.log('AuthContext - signOut called');
    console.log('AuthContext - current user before signOut:', user);
    await supabase.auth.signOut();
    console.log('AuthContext - signOut completed');
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};