import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Verificar se email já existe quando usuário digita
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        // Email já existe, trocar para modo login
        setIsLoginMode(true);
        setError('');
      } else {
        // Email não existe, manter modo cadastro
        setIsLoginMode(false);
        setError('');
      }
    } catch (error) {
      console.error('Erro ao verificar email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Função para fazer login
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
        // Verificar se é admin
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();

        // Se não há perfil, criar um básico
        if (profileError && profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              name: data.user.email?.split('@')[0] || 'Usuário',
              email: data.user.email || '',
              whatsapp: '',
              is_admin: false,
            });

          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
          }
        }

        // Redirecionar baseado no perfil ou padrão
        if (profile?.is_admin) {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
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

    // Validações
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

    try {
      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Criar perfil
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            whatsapp: formData.phone,
            is_admin: false,
            created_at: new Date().toISOString(),
          });

        if (profileError) throw profileError;

        // Enviar confirmação por WhatsApp se tiver número
        if (formData.phone) {
          // Aqui você pode integrar com o serviço WhatsApp
          console.log('Enviar confirmação para:', formData.phone);
        }

        navigate('/login', { 
          state: { message: 'Conta criada com sucesso! Verifique seu email.' }
        });
      }
    } catch (error: any) {
      if (error.message.includes('already registered') || 
          error.message.includes('email-already-in-use') ||
          error.message.includes('User already registered')) {
        setError('Este email já está cadastrado! Faça login em vez de se cadastrar novamente.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl mb-4">
              <span className="text-2xl font-bold text-white">ZK</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isLoginMode ? 'Faça seu login' : 'Crie sua conta'}
            </h1>
            <p className="text-gray-600">
              {isLoginMode 
                ? 'Entre com seu email e senha para acessar sua conta' 
                : 'Junte-se ao ZK Prêmios e comece a ganhar!'
              }
            </p>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-5">
              {isLoginMode && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <div className="flex-1">
                      <span className="font-medium">Email encontrado! Faça login com sua senha.</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <div className="flex-1">
                      <span className="font-medium">{error}</span>
                    </div>
                  </div>
                </div>
              )}

              {!isLoginMode && (
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      handleChange(e);
                      // Verificar email após 1 segundo de pausa na digitação
                      setTimeout(() => checkEmailExists(e.target.value), 1000);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="seu@email.com"
                    required
                  />
                  {checkingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                    </div>
                  )}
                </div>
              </div>

              {!isLoginMode && (
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    WhatsApp <span className="text-gray-500 text-sm font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                      placeholder="(31) 99999-9999"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>

              {!isLoginMode && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                      placeholder="Digite a senha novamente"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isLoginMode ? 'Entrando...' : 'Criando conta...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isLoginMode ? 'Entrar' : 'Criar Conta'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              {isLoginMode ? (
                <p className="text-gray-600">
                  Não tem uma conta?{' '}
                  <button 
                    onClick={() => {
                      setIsLoginMode(false);
                      setError('');
                    }}
                    className="text-amber-600 hover:text-amber-700 font-semibold transition-colors duration-200"
                  >
                    Cadastre-se aqui
                  </button>
                </p>
              ) : (
                <p className="text-gray-600">
                  Já tem uma conta?{' '}
                  <button 
                    onClick={() => {
                      setIsLoginMode(true);
                      setError('');
                    }}
                    className="text-amber-600 hover:text-amber-700 font-semibold transition-colors duration-200"
                  >
                    Faça login aqui
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-green-900 font-semibold text-sm">Cadastro Gratuito</p>
                  <p className="text-green-700 text-xs">Crie sua conta sem custos</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🎁</span>
                </div>
                <div>
                  <p className="text-purple-900 font-semibold text-sm">Prêmios Incríveis</p>
                  <p className="text-purple-700 text-xs">Concorra a prêmios exclusivos</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⚡</span>
                </div>
                <div>
                  <p className="text-blue-900 font-semibold text-sm">Notificações Instantâneas</p>
                  <p className="text-blue-700 text-xs">Seja notificado via WhatsApp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RegisterPage;

