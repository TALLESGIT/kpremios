import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      console.log('Tentando fazer login com:', { email, passwordLength: password.length });
      
      // Testar conexão com Supabase primeiro
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Erro de conexão com Supabase:', testError);
        setError('Erro de conexão com o servidor. Tente novamente.');
        return;
      }
      
      console.log('Conexão com Supabase OK, tentando login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('Erro de login:', error);
        
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
        console.log('Login bem-sucedido para usuário:', data.user.id);
        
        // Verificar se é admin
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();

        // Se não há perfil, criar um básico
        if (profileError && profileError.code === 'PGRST116') {
          console.log('Criando perfil básico para usuário:', data.user.id);
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
            setError('Erro ao criar perfil do usuário');
            return;
          }
        }

        // Recarregar dados do usuário após login
        try {
          await reloadUserData();
          console.log('Dados do usuário recarregados com sucesso');
        } catch (reloadError) {
          console.warn('Erro ao recarregar dados do usuário:', reloadError);
          // Não falha o login se o reload falhar
        }

        // Redirecionar baseado no perfil ou padrão
        if (profile?.is_admin) {
          console.log('Redirecionando para admin dashboard');
          navigate('/admin/dashboard');
        } else {
          console.log('Redirecionando para dashboard do usuário');
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Erro inesperado no login:', error);
      setError('Erro inesperado. Tente novamente.');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h1>
            <p className="text-gray-600">Entre na sua conta para continuar</p>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Debug Info - apenas em desenvolvimento */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-xs">
                  <div className="font-semibold mb-2">Debug Info:</div>
                  <div>Email: {email || 'vazio'}</div>
                  <div>Senha: {password ? '***' + password.slice(-2) : 'vazia'}</div>
                  <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'Configurado' : 'Não configurado'}</div>
                  <div>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado'}</div>
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
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
                  className="text-amber-600 hover:text-amber-700 font-semibold transition-colors duration-200"
                >
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🎯</span>
                </div>
                <div>
                  <p className="text-blue-900 font-semibold text-sm">Sorteios Exclusivos</p>
                  <p className="text-blue-700 text-xs">Participe de sorteios únicos</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🎮</span>
                </div>
                <div>
                  <p className="text-green-900 font-semibold text-sm">Sorteios ao Vivo</p>
                  <p className="text-green-700 text-xs">Jogue o Resta Um em tempo real</p>
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
