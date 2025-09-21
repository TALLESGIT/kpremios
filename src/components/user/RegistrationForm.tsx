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
  const { signUp, user } = useAuth();
  const { currentUser: currentAppUser } = useData();
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

  // Debug log para verificar estado

  // Verificar se dados já existem quando usuário digita
  const checkDataExists = async (email: string, whatsapp: string, name: string) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      const newErrors: Record<string, string> = {};

      // Verificar se email já existe
      if (email && email.includes('@')) {
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', email.trim())
          .maybeSingle();

        if (!emailError && emailData) {
          // Email existe - mudar para modo login sem erro

          setIsLoginMode(true);
          // Limpar erro de email para permitir login
          delete newErrors.email;
        } else {

          setIsLoginMode(false);
        }
      }

      // Verificar se WhatsApp já existe
      if (whatsapp && whatsapp.trim().length >= 10) {
        const { data: whatsappData, error: whatsappError } = await supabase
          .from('users')
          .select('id, whatsapp')
          .eq('whatsapp', whatsapp.trim())
          .maybeSingle();

        if (!whatsappError && whatsappData) {
          newErrors.whatsapp = 'Este WhatsApp já está cadastrado. Use outro número.';
        }
      }

      // Verificar se nome já existe
      if (name && name.trim().length >= 2) {
        const { data: nameData, error: nameError } = await supabase
          .from('users')
          .select('id, name')
          .eq('name', name.trim())
          .maybeSingle();

        if (!nameError && nameData) {
          newErrors.name = 'Este nome já está cadastrado. Use outro nome.';
        }
      }

      setErrors(newErrors);
    } catch (error) {

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

        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Email ou senha incorretos' });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Email não confirmado. Verifique sua caixa de entrada.' });
        } else if (error.message.includes('Too many requests')) {
          setErrors({ general: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
        } else {
          setErrors({ general: `Erro no login: ${error.message}` });
        }
        return;
      }

      if (data.user) {

        onSuccess();
      } else {

        setErrors({ general: 'Erro ao fazer login' });
      }
    } catch (error: any) {

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
      
      // Validação de email mais rigorosa
      if (!formData.email.trim()) {
        newErrors.email = 'Email é obrigatório';
      } else {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(formData.email)) {
          newErrors.email = 'Email inválido. Use um email real (ex: usuario@gmail.com)';
        } else if (formData.email.includes('@gmail.com') && !formData.email.match(/^[a-zA-Z0-9.]+@gmail\.com$/)) {
          newErrors.email = 'Email Gmail inválido. Use apenas letras, números e pontos';
        } else if (formData.email.includes('@hotmail.com') && !formData.email.match(/^[a-zA-Z0-9.]+@hotmail\.com$/)) {
          newErrors.email = 'Email Hotmail inválido. Use apenas letras, números e pontos';
        } else if (formData.email.includes('@outlook.com') && !formData.email.match(/^[a-zA-Z0-9.]+@outlook\.com$/)) {
          newErrors.email = 'Email Outlook inválido. Use apenas letras, números e pontos';
        }
      }
      
      if (!formData.password.trim() || formData.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
      
      // Validações específicas para cadastro
      if (!isLoginMode) {
        if (!formData.name.trim()) {
          newErrors.name = 'Nome é obrigatório';
        } else if (formData.name.trim().length < 2) {
          newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
        } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(formData.name.trim())) {
          newErrors.name = 'Nome deve conter apenas letras e espaços';
        }
        
        if (!formData.whatsapp.trim()) {
          newErrors.whatsapp = 'WhatsApp é obrigatório';
        } else {
          // Limpar WhatsApp (remover caracteres não numéricos)
          const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '');
          if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 11) {
            newErrors.whatsapp = 'WhatsApp deve ter 10 ou 11 dígitos (ex: 11999999999)';
          } else if (!cleanWhatsapp.startsWith('11') && !cleanWhatsapp.startsWith('12') && 
                     !cleanWhatsapp.startsWith('13') && !cleanWhatsapp.startsWith('14') && 
                     !cleanWhatsapp.startsWith('15') && !cleanWhatsapp.startsWith('16') && 
                     !cleanWhatsapp.startsWith('17') && !cleanWhatsapp.startsWith('18') && 
                     !cleanWhatsapp.startsWith('19') && !cleanWhatsapp.startsWith('21') && 
                     !cleanWhatsapp.startsWith('22') && !cleanWhatsapp.startsWith('24') && 
                     !cleanWhatsapp.startsWith('27') && !cleanWhatsapp.startsWith('28') && 
                     !cleanWhatsapp.startsWith('31') && !cleanWhatsapp.startsWith('32') && 
                     !cleanWhatsapp.startsWith('33') && !cleanWhatsapp.startsWith('34') && 
                     !cleanWhatsapp.startsWith('35') && !cleanWhatsapp.startsWith('37') && 
                     !cleanWhatsapp.startsWith('38') && !cleanWhatsapp.startsWith('41') && 
                     !cleanWhatsapp.startsWith('42') && !cleanWhatsapp.startsWith('43') && 
                     !cleanWhatsapp.startsWith('44') && !cleanWhatsapp.startsWith('45') && 
                     !cleanWhatsapp.startsWith('46') && !cleanWhatsapp.startsWith('47') && 
                     !cleanWhatsapp.startsWith('48') && !cleanWhatsapp.startsWith('49') && 
                     !cleanWhatsapp.startsWith('51') && !cleanWhatsapp.startsWith('53') && 
                     !cleanWhatsapp.startsWith('54') && !cleanWhatsapp.startsWith('55') && 
                     !cleanWhatsapp.startsWith('61') && !cleanWhatsapp.startsWith('62') && 
                     !cleanWhatsapp.startsWith('63') && !cleanWhatsapp.startsWith('64') && 
                     !cleanWhatsapp.startsWith('65') && !cleanWhatsapp.startsWith('66') && 
                     !cleanWhatsapp.startsWith('67') && !cleanWhatsapp.startsWith('68') && 
                     !cleanWhatsapp.startsWith('69') && !cleanWhatsapp.startsWith('71') && 
                     !cleanWhatsapp.startsWith('73') && !cleanWhatsapp.startsWith('74') && 
                     !cleanWhatsapp.startsWith('75') && !cleanWhatsapp.startsWith('77') && 
                     !cleanWhatsapp.startsWith('79') && !cleanWhatsapp.startsWith('81') && 
                     !cleanWhatsapp.startsWith('82') && !cleanWhatsapp.startsWith('83') && 
                     !cleanWhatsapp.startsWith('84') && !cleanWhatsapp.startsWith('85') && 
                     !cleanWhatsapp.startsWith('86') && !cleanWhatsapp.startsWith('87') && 
                     !cleanWhatsapp.startsWith('88') && !cleanWhatsapp.startsWith('89') && 
                     !cleanWhatsapp.startsWith('91') && !cleanWhatsapp.startsWith('92') && 
                     !cleanWhatsapp.startsWith('93') && !cleanWhatsapp.startsWith('94') && 
                     !cleanWhatsapp.startsWith('95') && !cleanWhatsapp.startsWith('96') && 
                     !cleanWhatsapp.startsWith('97') && !cleanWhatsapp.startsWith('98') && 
                     !cleanWhatsapp.startsWith('99')) {
            newErrors.whatsapp = 'DDD inválido. Use um DDD brasileiro válido';
          }
        }
      }
      
      // Verificar se há dados duplicados antes de prosseguir
      if (!isLoginMode) {
        const { data: existingEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email.trim())
          .maybeSingle();
        
        if (existingEmail) {
          setErrors({ email: 'Este email já está cadastrado. Faça login ou use outro email.' });
          setIsLoginMode(true);
          return;
        }
        
        const { data: existingWhatsapp } = await supabase
          .from('users')
          .select('id')
          .eq('whatsapp', formData.whatsapp.trim())
          .maybeSingle();
        
        if (existingWhatsapp) {
          setErrors({ whatsapp: 'Este WhatsApp já está cadastrado. Use outro número.' });
          return;
        }
        
        const { data: existingName } = await supabase
          .from('users')
          .select('id')
          .eq('name', formData.name.trim())
          .maybeSingle();
        
        if (existingName) {
          setErrors({ name: 'Este nome já está cadastrado. Use outro nome.' });
          return;
        }
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
        // Tentar fazer cadastro, mas se falhar por usuário já existir, tentar login
        try {
          await registerUser(
            formData.name,
            formData.email,
            formData.whatsapp,
            formData.password,
            selectedNumber
          );
        } catch (error: any) {
          // Se o erro for de usuário já existente, tentar fazer login
          if (error.message.includes('já está cadastrado') || 
              error.message.includes('already registered') ||
              error.message.includes('email-already-in-use')) {

            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            });
            
            if (loginError) {

              if (loginError.message.includes('Invalid login credentials')) {
                setErrors({ general: 'Email ou senha incorretos. Verifique suas credenciais.' });
              } else if (loginError.message.includes('Email not confirmed')) {
                setErrors({ general: 'Email não confirmado. Verifique sua caixa de entrada.' });
              } else {
                setErrors({ general: `Erro no login: ${loginError.message}` });
              }
              setIsLoginMode(true);
              return;
            }
            
            if (loginData.user) {
              // Login bem-sucedido, continuar normalmente

            }
          } else {
            // Outros erros, mostrar normalmente
            throw error;
          }
        }
      }
      
      onSuccess();
      
    } catch (error: any) {

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
                  Este email já está cadastrado no sistema. Use sua senha para fazer login.
                </p>
              </div>
            )}

            {/* Aviso sobre dados duplicados - apenas para WhatsApp e nome, não para email */}
            {(errors.whatsapp || errors.name) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 text-sm font-medium mb-2">
                  ⚠️ Dados já cadastrados no sistema
                </p>
                <div className="text-red-700 text-xs space-y-1">
                  {errors.whatsapp && <p>• {errors.whatsapp}</p>}
                  {errors.name && <p>• {errors.name}</p>}
                </div>
                <p className="text-red-600 text-xs mt-2">
                  Use dados diferentes ou faça login se já tem uma conta.
                </p>
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 text-sm">{errors.general}</p>
              </div>
            )}

            <form onSubmit={isLoginMode ? handleLogin : handleSubmit} className="space-y-6">
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
                      onChange={(e) => {
                        handleChange(e);
                        // Verificar dados após 1 segundo de pausa na digitação
                        setTimeout(() => checkDataExists(formData.email, formData.whatsapp, e.target.value), 1000);
                      }}
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
                      // Verificar dados após 1 segundo de pausa na digitação
                      setTimeout(() => checkDataExists(e.target.value, formData.whatsapp, formData.name), 1000);
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
                      onChange={(e) => {
                        handleChange(e);
                        // Verificar dados após 1 segundo de pausa na digitação
                        setTimeout(() => checkDataExists(formData.email, e.target.value, formData.name), 1000);
                      }}
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
                disabled={(() => {
                  const condition1 = loading;
                  const condition2 = (!isLoginMode && !selectedNumber);
                  const condition3 = (!isLoginMode && (errors.whatsapp || errors.name));
                  const finalCondition = condition1 || condition2 || condition3;

                  return finalCondition;
                })()}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-white transition-all duration-200 ${
                  !loading && (isLoginMode || (selectedNumber && !errors.whatsapp && !errors.name))
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