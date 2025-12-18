import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo;
  const { reloadUserData } = useData();

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

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido');
      setLoading(false);
      return;
    }

    try {
      // Testar conexão com Supabase primeiro
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (testError) {
        setError('Erro de conexão com o servidor. Tente novamente.');
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Tratar erros específicos
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message.includes('Too many requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (error.message.includes('Invalid email')) {
          setError('Email inválido');
        } else if (error.message.includes('Password should be at least')) {
          setError('Senha muito curta');
        } else {
          setError(`Erro de login: ${error.message}`);
        }
        return;
      }

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
            setError('Erro ao criar perfil do usuário');
            return;
          }
        }

        // Recarregar dados do usuário após login
        try {
          await reloadUserData();
        } catch (reloadError) {
          // Não falha o login se o reload falhar
        }

        // Redirecionar para returnTo se fornecido, senão baseado no perfil
        if (returnTo) {
          navigate(returnTo);
        } else if (profile?.is_admin) {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl mb-4 shadow-lg">
              <span className="text-2xl sm:text-3xl font-black text-white">ZK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-600 mb-2">Bem-vindo de volta!</h1>
            <p className="text-blue-600 text-sm sm:text-base">Entre na sua conta para continuar</p>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{error}</span>
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Não tem uma conta?{' '}
                <Link 
                  to="/register" 
                  className="text-blue-600 hover:text-blue-700 font-bold transition-colors duration-200"
                >
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl p-4 border-2 border-blue-300">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">🎯</span>
                </div>
                <div>
                  <p className="text-blue-900 font-bold text-sm sm:text-base">Sorteios Exclusivos</p>
                  <p className="text-blue-700 text-xs sm:text-sm">Participe de sorteios únicos</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl p-4 border-2 border-blue-300">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">🎮</span>
                </div>
                <div>
                  <p className="text-blue-900 font-bold text-sm sm:text-base">Sorteios ao Vivo</p>
                  <p className="text-blue-700 text-xs sm:text-sm">Jogue o Resta Um em tempo real</p>
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

export default LoginPage;
