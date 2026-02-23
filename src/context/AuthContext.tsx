import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
    // Limpar sessões inválidas no localStorage
    const clearInvalidSessions = () => {
      try {
        const authToken = localStorage.getItem('sb-bukigyhhgrtgryklabjg-auth-token');
        if (authToken) {
          try {
            const parsed = JSON.parse(authToken);
            // Verificar se o token está expirado
            if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) {
              localStorage.removeItem('sb-bukigyhhgrtgryklabjg-auth-token');
              localStorage.removeItem('supabase.auth.token');
            }
          } catch (parseError) {
            // Se não conseguir fazer parse, remove o token
            localStorage.removeItem('sb-bukigyhhgrtgryklabjg-auth-token');
            localStorage.removeItem('supabase.auth.token');
          }
        }
      } catch (error) {
        console.warn('Error clearing invalid sessions:', error);
      }
    };

    // Verificar sessão atual
    const getSession = async () => {
      try {
        // Limpar sessões inválidas primeiro
        clearInvalidSessions();

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session error:', error.message);
          // Clear any invalid session data
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.warn('Session fetch error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            // Inicializar notificações push no ambiente nativo
            import('../services/PushNotificationService').then(({ PushNotificationService }) => {
              PushNotificationService.initialize(session.user.id);
            });
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            setUser(session.user);
            // Re-garantir que as notificações estão ativas
            import('../services/PushNotificationService').then(({ PushNotificationService }) => {
              PushNotificationService.initialize(session.user.id);
            });
          } else if (event === 'INITIAL_SESSION') {
            setUser(session?.user ?? null);
            if (session?.user) {
              import('../services/PushNotificationService').then(({ PushNotificationService }) => {
                PushNotificationService.initialize(session.user.id);
              });
            }
          } else {
            setUser(session?.user ?? null);
          }
        } catch (err) {
          console.warn('Auth state change error:', err);
          setUser(null);
        } finally {
          // Garantir que o loading seja encerrado
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Tratar erros de timeout/conexão de forma mais clara
        if (error.message?.includes('timeout') || error.message?.includes('failed to connect') || error.message?.includes('NetworkError')) {
          console.warn('Sign in error: Problema de conexão com o servidor', error.message);
          return {
            error: {
              ...error,
              message: 'Erro de conexão. O servidor pode estar sobrecarregado. Tente novamente em alguns instantes.'
            }
          };
        }
        console.warn('Sign in error:', error.message);
        return { error };
      }

      if (data?.user) {
        console.log('Sign in successful:', data.user.email);
      }

      return { error: null };
    } catch (err: any) {
      // Tratar erros de rede/conexão
      if (err?.message?.includes('timeout') || err?.message?.includes('failed to connect') || err?.message?.includes('NetworkError')) {
        console.warn('Sign in exception: Problema de conexão', err.message);
        return {
          error: {
            message: 'Erro de conexão. O servidor pode estar sobrecarregado. Tente novamente em alguns instantes.'
          }
        };
      }
      console.warn('Sign in exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      // Limpar o estado do usuário imediatamente
      setUser(null);
      setLoading(false);

      // Fazer logout do Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.warn('Sign out error:', error.message);
      }

      // Limpar dados do localStorage relacionados ao Supabase
      try {
        localStorage.removeItem('sb-bukigyhhgrtgryklabjg-auth-token');
        localStorage.removeItem('supabase.auth.token');
        // Limpar qualquer cache relacionado
        if (typeof window !== 'undefined' && window.location) {
          // Força uma limpeza completa do estado
          window.location.reload();
        }
      } catch (storageError) {
        console.warn('Storage clear error:', storageError);
      }
    } catch (err) {
      console.warn('Sign out exception:', err);
      // Mesmo com erro, garantir que o estado seja limpo
      setUser(null);
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};