import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { Mail, Lock, ArrowRight, AlertCircle, Shield, Trophy, Loader2, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VipGrantedModal from '../components/vip/VipGrantedModal';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo;
  const { reloadUserData } = useData();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    import('../services/BiometricService').then(({ BiometricService }) => {
      BiometricService.isAvailable().then(available => {
        if (available) {
          BiometricService.isBiometricEnabled().then(enabled => {
            setBiometricAvailable(enabled);
            // Auto-trigger if enabled
            if (enabled) {
              handleBiometricLogin();
            }
          });
        }
      });
    });
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    const { BiometricService } = await import('../services/BiometricService');
    const success = await BiometricService.authenticate();

    if (success) {
      const credentials = await BiometricService.getCredentials();
      if (credentials) {
        setLoading(true);
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.username,
            password: credentials.password,
          });

          if (error) {
            setError(error.message);
            setLoading(false);
            return;
          }

          if (data.user) {
            toast.success('Login biométrico realizado!');
            await reloadUserData();
            const { data: profile } = await supabase
              .from('users')
              .select('is_admin')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile?.is_admin) {
              navigate('/admin/dashboard');
            } else {
              navigate('/');
            }
          }
        } catch (err) {
          setError('Erro ao realizar login biométrico');
        } finally {
          setLoading(false);
        }
      } else {
        toast.error('Nenhuma credencial salva. Faça o login manual uma vez.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações básicas
    if (!email.trim()) {
      setError('Email é obrigatório');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Senha é obrigatória');
      setLoading(false);
      return;
    }

    try {
      // Fazer login diretamente (o próprio signInWithPassword já testa a conexão)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message.includes('Too many requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else {
          setError(`Erro de login: ${error.message}`);
        }
        return;
      }

      if (data.user) {
        // Ativar biometria para o próximo login se estiver no mobile
        const { BiometricService } = await import('../services/BiometricService');
        if (await BiometricService.isAvailable()) {
          await BiometricService.saveCredentials(email, password);
        }

        // Tentar conceder VIP grátis se elegível (103 primeiros até 01/02/2026)
        try {
          const { data: vipGranted, error: vipError } = await supabase.rpc('grant_free_vip_if_eligible', {
            p_user_id: data.user.id
          });
          if (vipGranted && !vipError) {
            console.log('✅ VIP grátis concedido no login!');

            // Buscar data de expiração do VIP
            const { data: userData } = await supabase
              .from('users')
              .select('vip_expires_at')
              .eq('id', data.user.id)
              .single();

            if (userData?.vip_expires_at) {
              setVipExpiresAt(userData.vip_expires_at);
            }

            // Mostrar modal de VIP concedido
            setShowVipModal(true);
          }
        } catch (vipError) {
          console.error('Erro ao verificar VIP grátis:', vipError);
          // Não falha o login se houver erro
        }

        // Recarregar dados do usuário
        try {
          await reloadUserData();
        } catch (reloadError) {
          // Não falha o login se o reload falhar
        }

        // Verificar e criar perfil se necessário
        const { data: profile } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', data.user.id)
          .maybeSingle();

        if (returnTo) {
          navigate(returnTo);
        } else if (profile?.is_admin) {
          navigate('/admin/dashboard');
        } else {
          navigate('/'); // Redirecionar para home após login
        }
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">

            {/* Header Area */}
            <div className="relative bg-primary/20 p-8 text-center border-b border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-md border border-white/20 shadow-lg group">
                <span className="text-3xl font-black text-white group-hover:scale-110 transition-transform">ZK</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Bem-vindo de volta!</h1>
              <p className="text-blue-200 text-sm mt-1">Acesse sua conta para participar</p>
            </div>

            {/* Form Area */}
            <div className="p-8 bg-black/20 backdrop-blur-md">
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="password" className="block text-xs font-bold text-blue-200 uppercase tracking-widest">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        // Limpar hash da URL antes de navegar (resolve problema em produção)
                        if (window.location.hash) {
                          window.history.replaceState(null, '', window.location.pathname + window.location.search);
                        }
                        navigate('/forgot-password', { replace: true });
                      }}
                      className="text-xs text-accent hover:text-white transition-colors cursor-pointer relative z-10 bg-transparent border-0 p-0 font-inherit"
                      style={{ pointerEvents: 'auto' }}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-accent transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-primary py-4 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Acessar Conta</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {biometricAvailable && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    className="w-full mt-4 flex items-center justify-center gap-2 text-accent font-bold py-3 border-2 border-accent/20 rounded-xl hover:bg-accent/5 transition-all"
                  >
                    <Fingerprint className="h-5 w-5" />
                    <span>Entrar com Biometria</span>
                  </button>
                )}
              </form>

              <div className="mt-8 text-center border-t border-white/5 pt-6 space-y-2">
                <p className="text-slate-400 text-sm">
                  Não tem uma conta?{' '}
                  <Link
                    to="/register"
                    className="text-accent hover:text-white font-bold transition-colors ml-1"
                  >
                    Cadastre-se grátis
                  </Link>
                </p>
                <p className="text-slate-400 text-sm">
                  Não lembra seu email?{' '}
                  <Link
                    to="/forgot-email"
                    className="text-accent hover:text-white font-bold transition-colors ml-1"
                  >
                    Recuperar email
                  </Link>
                </p>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-black/40 p-4 grid grid-cols-2 divide-x divide-white/5">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Dados Seguros</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Trophy className="w-4 h-4 text-accent" />
                <span>Prêmios Oficiais</span>
              </div>
            </div>

          </div>
        </div>
      </main>

    </>
  );
};

export default LoginPage;
