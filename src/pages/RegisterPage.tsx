import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';


const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo;
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const checkEmailExists = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setIsLoginMode(false);
      return;
    }

    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        setIsLoginMode(true);
        setError('');
      } else {
        setIsLoginMode(false);
        setError('');
      }
    } catch (error) {
      // Silenciar erros de rede
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    const email = e.target.value;

    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    if (email && email.includes('@') && email.includes('.')) {
      emailCheckTimeoutRef.current = setTimeout(() => {
        checkEmailExists(email);
      }, 800);
    } else {
      setIsLoginMode(false);
      setCheckingEmail(false);
    }
  }, [checkEmailExists]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
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
          navigate('/user-dashboard');
        }
      }
    } catch (error: any) {
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError('WhatsApp é obrigatório para recuperação de conta');
      setLoading(false);
      return;
    }

    // Validar formato do WhatsApp
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setError('WhatsApp inválido. Digite um número válido (ex: 11987654321)');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            whatsapp: formData.phone.trim(),
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Criar perfil
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: formData.name.trim(),
            email: formData.email.trim(),
            whatsapp: formData.phone.trim(),
            is_admin: false,
            created_at: new Date().toISOString(),
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          // Ignorar erros de duplicação se o auth já passou
        }

        navigate('/login', {
          state: {
            message: 'Conta criada com sucesso! Verifique seu email para confirmar.',
            returnTo: returnTo
          }
        });
      }
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        setError('Este email já está cadastrado!');
        setIsLoginMode(true);
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
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

            {/* Header */}
            <div className="relative bg-primary/20 p-8 text-center border-b border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-md border border-white/20 shadow-lg group">
                <span className="text-3xl font-black text-white group-hover:scale-110 transition-transform">ZK</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {isLoginMode ? 'Bem-vindo de volta!' : 'Cadastre-se Grátis'}
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {isLoginMode ? 'Acesse sua conta para continuar' : 'Crie sua conta e participe dos sorteios'}
              </p>
            </div>

            {/* Form */}
            <div className="p-8 bg-black/20 backdrop-blur-md">
              <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-5">

                {isLoginMode && (
                  <div className="bg-blue-500/10 border border-blue-400/30 text-blue-200 px-4 py-3 rounded-xl flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-400 mt-0.5" />
                    <span className="text-sm font-medium">Email encontrado! Faça login.</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                {!isLoginMode && (
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                      Nome Completo
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                      </div>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                        placeholder="Seu nome"
                        required
                      />
                    </div>
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
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="seu@email.com"
                      required
                    />
                    {checkingEmail && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="animate-spin h-4 w-4 text-accent" />
                      </div>
                    )}
                  </div>
                </div>

                {!isLoginMode && (
                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                      WhatsApp <span className="text-red-400 text-[10px] normal-case ml-1">(obrigatório)</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                        placeholder="11987654321"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Necessário para recuperação de conta. Digite apenas números.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                    Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder={isLoginMode ? "••••••••" : "Mínimo 6 caracteres"}
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

                {!isLoginMode && (
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
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                        placeholder="Repita sua senha"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-accent transition-colors"
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
                )}

                <button
                  type="submit"
                  disabled={loading || checkingEmail}
                  className="w-full btn btn-primary py-4 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20 mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Processando...</span>
                    </>
                  ) : checkingEmail ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>{isLoginMode ? 'Acessar Conta' : 'Criar Minha Conta'}</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-slate-400 text-sm">
                  {isLoginMode ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                  <button
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setError('');
                    }}
                    className="text-accent hover:text-white font-bold transition-colors ml-1 hover:underline underline-offset-4"
                  >
                    {isLoginMode ? 'Cadastre-se grátis' : 'Fazer login'}
                  </button>
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

    </>
  );
};

export default RegisterPage;
