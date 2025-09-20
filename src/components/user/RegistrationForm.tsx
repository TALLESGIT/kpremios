import React, { useState } from 'react';
import { Send, Loader2, Mail, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface RegistrationFormProps {
  selectedNumber: number | null;
  onSuccess: () => void;
}

function RegistrationForm({ selectedNumber, onSuccess }: RegistrationFormProps) {
  const { registerUser } = useData();
  const { signUp, user, currentAppUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Don't render form for admin users
  if (currentAppUser?.is_admin) {
    return null;
  }

  // Verificar se email já existe quando usuário digita
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      // Verificar se existe na tabela users
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        // Email já existe na tabela users, sugerir modo login
        setIsLoginMode(true);
        setErrors({});
      } else {
        // Email não existe, manter modo cadastro
        setIsLoginMode(false);
        setErrors({});
      }
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      // Em caso de erro, manter modo cadastro
      setIsLoginMode(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Função para fazer login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNumber) return;

    setLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Login error details:', error);
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Email ou senha incorretos' });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Email não confirmado. Verifique sua caixa de entrada.' });
        } else {
          setErrors({ general: `Erro no login: ${error.message}` });
        }
        return;
      }

      if (data.user) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ general: 'Erro ao fazer login' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNumber) return;

    setLoading(true);
    setErrors({});
    
    try {
      // Validate form
      const newErrors: Record<string, string> = {};
      if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
      if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
      if (!formData.password.trim() || formData.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
      
      // Validações específicas para cadastro
      if (!isLoginMode) {
        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
        if (!formData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp é obrigatório';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      if (isLoginMode) {
        // Fazer login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        if (error) {
          console.error('Login error details:', error);
          if (error.message.includes('Invalid login credentials')) {
            setErrors({ general: 'Email ou senha incorretos' });
          } else if (error.message.includes('Email not confirmed')) {
            setErrors({ general: 'Email não confirmado. Verifique sua caixa de entrada.' });
          } else {
            setErrors({ general: `Erro no login: ${error.message}` });
          }
          return;
        }

        if (!data.user) {
          setErrors({ general: 'Erro ao fazer login' });
          return;
        }
      } else {
        // Fazer cadastro
        await registerUser(
          formData.name,
          formData.email,
          formData.whatsapp,
          formData.password,
          selectedNumber
        );
      }
      
      onSuccess();
      
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Erro inesperado. Verifique sua conexão e tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <section id="registration-form" className="py-16 px-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6">
            <h2 className="text-2xl font-bold text-white text-center">
              Complete seu Cadastro
            </h2>
            <p className="text-slate-300 text-center mt-2">
              Finalize sua participação no sorteio
            </p>
          </div>

          <div className="p-8">
            {selectedNumber && (
              <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
                <div className="text-center">
                  <p className="text-slate-700 mb-2">Número Selecionado</p>
                  <span className="text-4xl font-bold text-amber-600">#{selectedNumber}</span>
                  <p className="text-sm text-slate-600 mt-2">
                    Este número ficará reservado para você após o cadastro
                  </p>
                </div>
              </div>
            )}

            {isLoginMode && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800 text-sm font-medium">
                  Email encontrado! Faça login com sua senha.
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Se não conseguir fazer login, pode ser que o usuário não foi criado no sistema de autenticação. 
                  Tente fazer cadastro novamente.
                </p>
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 text-sm">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              {/* Nome - apenas no modo cadastro */}
              {!isLoginMode && (
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      autoComplete="name"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                        errors.name ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                      }`}
                      placeholder="Digite seu nome completo"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => {
                      handleChange(e);
                      // Verificar email após 1 segundo de pausa na digitação
                      setTimeout(() => checkEmailExists(e.target.value), 1000);
                    }}
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                    placeholder="seu.email@exemplo.com"
                  />
                  {checkingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                    </div>
                  )}
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* WhatsApp - apenas no modo cadastro */}
              {!isLoginMode && (
                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-semibold text-slate-700 mb-2">
                    WhatsApp *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      autoComplete="tel"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                        errors.whatsapp ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                      }`}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  {errors.whatsapp && <p className="mt-1 text-sm text-red-600">{errors.whatsapp}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    Usado para contato em caso de vitória
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedNumber || loading}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-white transition-all duration-200 ${
                  selectedNumber && !loading
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' 
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {isLoginMode ? 'Entrando...' : 'Processando...'}
                  </>
                ) : (
                  <>
                    {isLoginMode ? 'Fazer Login' : 'Confirmar Cadastro'}
                    <Send size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              {isLoginMode ? (
                <p className="text-sm text-slate-600">
                  Não tem uma conta?{' '}
                  <button 
                    onClick={() => {
                      setIsLoginMode(false);
                      setErrors({});
                    }}
                    className="text-amber-600 hover:text-amber-700 font-semibold transition-colors duration-200"
                  >
                    Cadastre-se aqui
                  </button>
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Já tem uma conta?{' '}
                  <button 
                    onClick={() => {
                      setIsLoginMode(true);
                      setErrors({});
                    }}
                    className="text-amber-600 hover:text-amber-700 font-semibold transition-colors duration-200"
                  >
                    Faça login aqui
                  </button>
                </p>
              )}
              
              <p className="text-xs text-slate-500 mt-2">
                Ao se cadastrar, você concorda com nossos termos de uso e política de privacidade
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RegistrationForm;