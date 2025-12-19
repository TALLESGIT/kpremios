import React, { useState } from 'react';
import { Send, Loader2, Mail, User, Phone, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';

import { supabase } from '../../lib/supabase';

interface RegistrationFormProps {
  selectedNumber: number | null;
  onSuccess: () => void;
}

function RegistrationForm({ selectedNumber, onSuccess }: RegistrationFormProps) {
  const { registerUser, selectFreeNumber } = useData();

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
          setIsLoginMode(true);
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
        // Associate the selected number with the user
        if (selectedNumber) {
          const success = await selectFreeNumber(selectedNumber);
          if (!success) {
            setErrors({ general: 'Erro ao associar número ao usuário. Tente novamente.' });
            return;
          }
        }

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
              // Login bem-sucedido, associar número se necessário
              if (selectedNumber) {
                const success = await selectFreeNumber(selectedNumber);
                if (!success) {
                  setErrors({ general: 'Erro ao associar número ao usuário. Tente novamente.' });
                  return;
                }
              }
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
    <section id="registration-form" className="py-8 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="glass-panel text-white rounded-3xl overflow-hidden shadow-2xl border border-white/20">
          {/* Header */}
          <div className="bg-primary/90 px-8 py-6 border-b border-white/10">
            <h2 className="text-2xl font-black text-white text-center tracking-tight">
              {isLoginMode ? 'Acessar Conta do Torcedor' : 'Cadastro do Torcedor'}
            </h2>
            <p className="text-blue-100 text-center mt-2 text-sm">
              {isLoginMode ? 'Entre para confirmar sua participação' : 'Finalize seu cadastro para participar'}
            </p>
          </div>

          <div className="p-8 bg-black/40 backdrop-blur-md">
            {selectedNumber && (
              <div className="mb-8 p-6 bg-primary/20 rounded-2xl border border-primary/40 text-center backdrop-blur-sm">
                <p className="text-blue-200 mb-2 uppercase text-xs font-bold tracking-widest">Número Reservado</p>
                <span className="text-5xl font-black text-white drop-shadow-md">#{selectedNumber}</span>
                <p className="text-sm text-blue-200 mt-2">
                  Complete o processo abaixo para confirmar este número
                </p>
              </div>
            )}

            {isLoginMode && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-300 text-sm font-bold">
                    Email encontrado!
                  </p>
                  <p className="text-blue-200/80 text-xs mt-1">
                    Este email já consta na nossa base. Use sua senha para confirmar.
                  </p>
                </div>
              </div>
            )}

            {(errors.whatsapp || errors.name) && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm font-bold">Dados já cadastrados</p>
                </div>
                <div className="text-red-300 text-xs pl-6 space-y-1">
                  {errors.whatsapp && <p>• {errors.whatsapp}</p>}
                  {errors.name && <p>• {errors.name}</p>}
                </div>
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                <p className="text-red-400 text-sm font-medium">{errors.general}</p>
              </div>
            )}

            <form onSubmit={isLoginMode ? handleLogin : handleSubmit} className="space-y-6">
              {/* Name (Cadastro Only) */}
              {!isLoginMode && (
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-blue-200 mb-2 uppercase tracking-wide">
                    Nome Completo
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => {
                        handleChange(e);
                        setTimeout(() => checkDataExists(formData.email, formData.whatsapp, e.target.value), 1000);
                      }}
                      autoComplete="name"
                      className={`w-full pl-10 pr-4 py-4 bg-white/5 border rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-all outline-none ${errors.name ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                        }`}
                      placeholder="Ex: Talles Coelho"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-400 font-medium pl-1">{errors.name}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-blue-200 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => {
                      handleChange(e);
                      setTimeout(() => checkDataExists(e.target.value, formData.whatsapp, formData.name), 1000);
                    }}
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-4 bg-white/5 border rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-all outline-none ${errors.email ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                      }`}
                    placeholder="seu@falso.com"
                  />
                  {checkingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="animate-spin h-4 w-4 text-accent" />
                    </div>
                  )}
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-400 font-medium pl-1">{errors.email}</p>}
              </div>

              {/* WhatsApp (Cadastro Only) */}
              {!isLoginMode && (
                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-bold text-blue-200 mb-2 uppercase tracking-wide">
                    WhatsApp
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      type="tel"
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => {
                        handleChange(e);
                        setTimeout(() => checkDataExists(formData.email, e.target.value, formData.name), 1000);
                      }}
                      autoComplete="tel"
                      className={`w-full pl-10 pr-4 py-4 bg-white/5 border rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-all outline-none ${errors.whatsapp ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                        }`}
                      placeholder="(DD) 99999-9999"
                    />
                  </div>
                  {errors.whatsapp && <p className="mt-1 text-sm text-red-400 font-medium pl-1">{errors.whatsapp}</p>}
                </div>
              )}

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-blue-200 mb-2 uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-12 py-4 bg-white/5 border rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-all outline-none ${errors.password ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                      }`}
                    placeholder="Sua senha secreta"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-400 font-medium pl-1">{errors.password}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (!isLoginMode && !selectedNumber) || (!isLoginMode && !!(errors.whatsapp || errors.name))}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-bold text-lg text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${!loading && (isLoginMode || (selectedNumber && !errors.whatsapp && !errors.name))
                  ? 'bg-gradient-to-r from-primary via-primary-light to-primary shadow-lg shadow-primary/30'
                  : 'bg-slate-600/50 cursor-not-allowed border border-white/5'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <span>{isLoginMode ? 'Entrar e Participar' : 'Confirmar e Participar'}</span>
                    <Send size={24} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-6">
              {isLoginMode ? (
                <p className="text-sm text-blue-200">
                  Ainda não tem cadastro?{' '}
                  <button
                    onClick={() => {
                      setIsLoginMode(false);
                      setErrors({});
                    }}
                    className="text-accent hover:text-white font-bold underline decoration-2 underline-offset-4 transition-colors ml-1"
                  >
                    Criar conta
                  </button>
                </p>
              ) : (
                <p className="text-sm text-blue-200">
                  Já possui cadastro?{' '}
                  <button
                    onClick={() => {
                      setIsLoginMode(true);
                      setErrors({});
                    }}
                    className="text-accent hover:text-white font-bold underline decoration-2 underline-offset-4 transition-colors ml-1"
                  >
                    Entrar agora
                  </button>
                </p>
              )}

              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-6 font-semibold">
                Ambiente 100% Seguro
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RegistrationForm;