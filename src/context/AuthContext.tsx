import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { User as AppUser } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentAppUser: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loadAppUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentAppUser, setCurrentAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentAppUser?.is_admin || false;
  
  // Debug log
  console.log('AuthContext - currentAppUser:', currentAppUser);
  console.log('AuthContext - isAdmin:', isAdmin);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAppUser(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Add a delay to ensure user data is available in the database
        setTimeout(() => {
          loadAppUser(session.user.id);
        }, 2000);
      } else {
        setCurrentAppUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAppUser = async (userId: string) => {
    try {
      console.log('Loading app user for ID:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*, is_admin')
        .eq('id', userId)
        .limit(1);

      if (error) {
        console.error('Error loading app user:', error);
        setCurrentAppUser(null);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('App user loaded successfully:', data[0]);
        setCurrentAppUser(data[0]);
      } else {
        console.log('No app user found for userId:', userId);
        setCurrentAppUser(null);
      }
      
    } catch (error) {
      console.error('Error loading app user:', error);
      setCurrentAppUser(null);
    }
  };
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // Disable email confirmation
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentAppUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      currentAppUser,
      isAdmin,
      loading,
      signUp,
      signIn,
      signOut,
      loadAppUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}