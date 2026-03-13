import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { Mail, Lock, ArrowRight, AlertCircle, Shield, Trophy, Loader2, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { toast } from "react-hot-toast";
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
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
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [showBioPrompt, setShowBioPrompt] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      if (result.isAvailable) {
        // Check if user has previously opted-in/saved biometrics for this app
        const hasBioSet = localStorage.getItem('zk_biometrics_active') === 'true';
        setCanUseBiometrics(hasBioSet);
      }
    } catch (e) {
      console.log('Biometrics not available');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      await NativeBiometric.verifyIdentity({
        reason: "Para entrar no ZK Oficial",
        title: "Login Biométrico",
        subtitle: "Use sua digital ou face para entrar",
        description: "Confirme sua identidade para continuar",
      });

      const credentials = await NativeBiometric.getCredentials({
        server: "zk_oficial_auth",
      });

      if (credentials && credentials.username && credentials.password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.username,
          password: credentials.password,
        });

        if (error) throw error;
        if (data.user) {
          toast.success("Login realizado com sucesso!");
          navigate(returnTo || "/");
        }
      } else {
        toast.error("Erro ao recuperar credenciais biométricas.");
      }
    } catch (error: any) {
      console.error('Biometric error:', error);
      toast.error("Falha na biometria. Use sua senha.");
    } finally {
      setLoading(false);
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
          // Check if biometrics is available but not active
          const bioAvailable = await NativeBiometric.isAvailable();
          const bioActive = localStorage.getItem('zk_biometrics_active') === 'true';

          if (bioAvailable.isAvailable && !bioActive) {
            setShowBioPrompt(true);
          } else {
            navigate('/');
          }
        }
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="w-full flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 relative min-h-[100dvh]">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5">
            {/* Inner Glow */}
            <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] pointer-events-none"></div>

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
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent/50 focus:bg-white/10 transition-all shadow-inner"
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
                      className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent/50 focus:bg-white/10 transition-all shadow-inner"
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
                  className="w-full bg-gradient-to-r from-accent to-accent/90 hover:from-accent hover:to-accent text-primary font-black py-4 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 transition-all"
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

                {canUseBiometrics && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 active:scale-95 transition-all group"
                  >
                    <Fingerprint className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                    <span className="font-bold uppercase tracking-tight italic">Entrar com Biometria</span>
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

      <Footer />

      {/* Modal de VIP Concedido */}
      <VipGrantedModal
        isOpen={showVipModal}
        onClose={() => {
          setShowVipModal(false);
          // Após fechar o modal, recarregar dados do usuário para garantir que o VIP está atualizado
          reloadUserData();
        }}
        expiresAt={vipExpiresAt}
      />
      {/* Modal de Promoção de Biometria */}
      <AnimatePresence>
        {showBioPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-accent/20 rounded-3xl flex items-center justify-center text-accent mb-6 mx-auto">
                <Fingerprint className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 uppercase italic">Ativar Biometria?</h2>
              <p className="text-blue-200/60 mb-8">
                Deseja usar sua digital ou reconhecimento facial para entrar mais rápido nas próximas vezes?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      await NativeBiometric.setCredentials({
                        username: email,
                        password: password,
                        server: "zk_oficial_auth",
                      });
                      localStorage.setItem('zk_biometrics_active', 'true');
                      toast.success("Biometria ativada!");
                    } catch (e) {
                      toast.error("Erro ao ativar biometria.");
                    } finally {
                      setShowBioPrompt(false);
                      navigate('/');
                    }
                  }}
                  className="w-full bg-accent hover:bg-white text-primary font-black py-4 rounded-2xl transition-all shadow-lg"
                >
                  SIM, ATIVAR AGORA
                </button>
                <button
                  onClick={() => {
                    setShowBioPrompt(false);
                    navigate('/');
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  DEPOIS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
