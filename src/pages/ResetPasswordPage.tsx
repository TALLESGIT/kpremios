import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, ArrowRight, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há um token de recuperação na URL
    const checkRecoveryToken = async () => {
      try {
        // Detectar se é mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

        // Verificar hash na URL (desktop) e query params (mobile)
        const hash = window.location.hash.substring(1);
        const searchParams = new URLSearchParams(window.location.search);

        // Tentar obter token do hash primeiro, depois dos query params
        const hashParams = new URLSearchParams(hash);
        const accessTokenFromHash = hashParams.get('access_token');
        const typeFromHash = hashParams.get('type');

        const accessTokenFromQuery = searchParams.get('access_token');
        const typeFromQuery = searchParams.get('type');

        const accessToken = accessTokenFromHash || accessTokenFromQuery;
        const type = typeFromHash || typeFromQuery;

        console.log('Token check:', {
          hash,
          hasHashToken: !!accessTokenFromHash,
          hasQueryToken: !!accessTokenFromQuery,
          type,
          isMobile
        });

        // Se há token de recuperação, aguardar processamento
        if (accessToken && type === 'recovery') {
          let resolved = false;
          let subscription: any = null;
          let checkInterval: NodeJS.Timeout | null = null;
          let timeoutId: NodeJS.Timeout | null = null;

          // No mobile, tentar processar o token imediatamente
          if (isMobile && accessToken) {
            try {
              // Tentar usar setSession diretamente com o token
              const { data: { session }, error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: hashParams.get('refresh_token') || searchParams.get('refresh_token') || ''
              });

              if (session && !setSessionError) {
                console.log('Sessão criada manualmente no mobile');
                resolved = true;
                window.history.replaceState(null, '', window.location.pathname);
                setIsValidToken(true);
                setCheckingToken(false);
                return;
              }
            } catch (e) {
              console.log('Erro ao definir sessão manualmente:', e);
            }
          }

          // Verificar se já existe sessão
          try {
            const { data: { session: manualSession }, error: manualError } = await supabase.auth.getSession();
            if (manualSession && !manualError) {
              console.log('Sessão já existe após carregar');
              resolved = true;
              window.history.replaceState(null, '', window.location.pathname);
              setIsValidToken(true);
              setCheckingToken(false);
              return;
            }
          } catch (e) {
            console.log('Erro ao verificar sessão manual:', e);
          }

          // Escutar o evento PASSWORD_RECOVERY ou SIGNED_IN
          const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth event:', event, session ? 'has session' : 'no session');

              if (!resolved && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && session))) {
                if (session) {
                  resolved = true;
                  if (checkInterval) clearInterval(checkInterval);
                  if (timeoutId) clearTimeout(timeoutId);

                  // Limpar hash/query da URL após confirmar sessão
                  window.history.replaceState(null, '', window.location.pathname);

                  setIsValidToken(true);
                  setCheckingToken(false);

                  if (authSubscription) {
                    authSubscription.unsubscribe();
                  }
                }
              }
            }
          );
          subscription = authSubscription;

          // Verificar sessão periodicamente (fallback) - mais frequente no mobile
          const checkIntervalMs = isMobile ? 100 : 200;
          checkInterval = setInterval(async () => {
            if (!resolved) {
              try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (session && !sessionError) {
                  resolved = true;
                  if (checkInterval) clearInterval(checkInterval);
                  if (timeoutId) clearTimeout(timeoutId);

                  // Limpar hash/query da URL após confirmar sessão
                  window.history.replaceState(null, '', window.location.pathname);

                  setIsValidToken(true);
                  setCheckingToken(false);

                  if (subscription) {
                    subscription.unsubscribe();
                  }
                }
              } catch (e) {
                console.error('Erro ao verificar sessão no intervalo:', e);
              }
            }
          }, checkIntervalMs);

          // Timeout mais curto no mobile (3s) vs desktop (5s)
          const timeoutMs = isMobile ? 3000 : 5000;
          timeoutId = setTimeout(async () => {
            if (!resolved) {
              resolved = true;
              if (checkInterval) clearInterval(checkInterval);

              // Limpar hash/query da URL
              window.history.replaceState(null, '', window.location.pathname);

              try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (session && !sessionError) {
                  setIsValidToken(true);
                  setCheckingToken(false);
                } else {
                  console.error('Sessão não encontrada após timeout:', sessionError);
                  setIsValidToken(false);
                  setCheckingToken(false);
                  setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
                }
              } catch (e) {
                console.error('Erro ao verificar sessão no timeout:', e);
                setIsValidToken(false);
                setCheckingToken(false);
                setError('Erro ao verificar link. Tente novamente.');
              }

              if (subscription) {
                subscription.unsubscribe();
              }
            }
          }, timeoutMs);

          return () => {
            if (checkInterval) clearInterval(checkInterval);
            if (timeoutId) clearTimeout(timeoutId);
            if (subscription) subscription.unsubscribe();
          };
        } else {
          // Não há token na URL, verificar se já existe sessão (usuário já autenticado)
          await new Promise(resolve => setTimeout(resolve, 1500));

          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (session && !sessionError) {
              // Já autenticado, permitir redefinir senha
              setIsValidToken(true);
              setCheckingToken(false);
            } else {
              // Sem token e sem sessão = link inválido
              console.log('Sem token e sem sessão');
              setIsValidToken(false);
              setCheckingToken(false);
              setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
            }
          } catch (e) {
            console.error('Erro ao verificar sessão:', e);
            setIsValidToken(false);
            setCheckingToken(false);
            setError('Erro ao verificar link. Tente novamente.');
          }
        }
      } catch (err) {
        console.error('Erro ao verificar token:', err);
        setIsValidToken(false);
        setCheckingToken(false);
        setError('Erro ao verificar link. Tente novamente.');
      }
    };

    checkRecoveryToken();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message.includes('same as')) {
          setError('A nova senha deve ser diferente da senha atual');
        } else if (updateError.message.includes('expired')) {
          setError('Link expirado. Solicite um novo link de recuperação.');
        } else {
          setError(`Erro ao atualizar senha: ${updateError.message}`);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
      console.error('Erro ao redefinir senha:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading enquanto verifica token
  if (checkingToken) {
    return (
      <>
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

          <div className="w-full max-w-md relative z-10">
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-8 text-center">
              <Loader2 className="animate-spin h-12 w-12 text-accent mx-auto mb-4" />
              <p className="text-white text-sm font-medium">Verificando link de recuperação...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Se token inválido, mostrar erro
  if (isValidToken === false) {
    return (
      <>
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

          <div className="w-full max-w-md relative z-10">
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <div className="relative bg-primary/20 p-8 text-center border-b border-white/5">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mb-4 backdrop-blur-md border border-red-500/30 shadow-lg">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Link Inválido</h1>
                <p className="text-blue-200 text-sm mt-1">Este link de recuperação não é válido</p>
              </div>

              <div className="p-8 bg-black/20 backdrop-blur-md text-center space-y-4">
                <p className="text-slate-300 text-sm">
                  {error || 'O link pode ter expirado ou já foi usado. Solicite um novo link de recuperação.'}
                </p>
                <button
                  onClick={() => navigate('/forgot-password')}
                  className="w-full btn btn-primary py-3 min-h-[48px] rounded-xl flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform"
                >
                  <span>Solicitar Novo Link</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 min-h-[48px] rounded-xl border border-white/10 text-white hover:bg-white/5 active:bg-white/10 transition-colors text-sm touch-manipulation"
                >
                  Voltar para o login
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (success) {
    return (
      <>
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

          <div className="w-full max-w-md relative z-10">
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <div className="relative bg-primary/20 p-8 text-center border-b border-white/5">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-2xl mb-4 backdrop-blur-md border border-green-500/30 shadow-lg">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Senha Redefinida!</h1>
                <p className="text-blue-200 text-sm mt-1">Sua senha foi atualizada com sucesso</p>
              </div>

              <div className="p-8 bg-black/20 backdrop-blur-md text-center">
                <p className="text-slate-300 text-sm mb-6">
                  Você será redirecionado para a página de login em instantes...
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full btn btn-primary py-3 min-h-[48px] rounded-xl flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform"
                >
                  <span>Ir para o login</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden min-h-[calc(100vh-200px)]">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            {/* Header Area */}
            <div className="relative bg-primary/20 p-6 sm:p-8 text-center border-b border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-md border border-white/20 shadow-lg group">
                <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-accent group-hover:scale-110 transition-transform" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Nova Senha</h1>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">Defina uma nova senha para sua conta</p>
            </div>

            {/* Form Area */}
            <div className="p-6 sm:p-8 bg-black/20 backdrop-blur-md">
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                    Nova Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 text-base sm:text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="Mínimo 6 caracteres"
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      inputMode="text"
                      minLength={6}
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-accent transition-colors touch-manipulation"
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 text-base sm:text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="Digite a senha novamente"
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      inputMode="text"
                      minLength={6}
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-accent transition-colors touch-manipulation"
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || isValidToken !== true}
                  className="w-full btn btn-primary py-4 min-h-[48px] rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <span>Redefinir Senha</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

    </>
  );
};

export default ResetPasswordPage;

