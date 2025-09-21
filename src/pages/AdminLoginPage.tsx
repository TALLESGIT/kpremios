import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { ZKLogo } from '../components/shared/ZKLogo';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (!signInError) {
        // Redirect directly to admin dashboard
        navigate('/admin/dashboard');
      } else {

        if (signInError.message === 'Invalid login credentials') {
          setError('Credenciais inválidas');
        } else if (signInError.message === 'Email not confirmed') {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (signInError.message === 'Too many requests') {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else {
          setError(signInError.message || 'Erro ao fazer login');
        }
      }
    } catch (err) {

      setError('Erro inesperado ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full">
      <Header />
      <main className="flex-grow flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-center mb-6">
              <ZKLogo size="lg" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Acesso Administrativo
            </h2>
            {error === 'Credenciais inválidas' && (
              <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <div className="text-sm">
                  <p className="font-semibold mb-3 text-red-800">❌ Usuário admin não encontrado no Supabase Auth!</p>
                  <p className="text-red-700 mb-3">⚠️ Definir `is_admin=true` na tabela não é suficiente. Você precisa criar o usuário no sistema de autenticação:</p>
                  <div className="bg-red-100 p-3 rounded text-red-800 space-y-1">
                    <p><strong>1.</strong> Abra seu Supabase Dashboard</p>
                    <p><strong>2.</strong> Vá em Authentication → Users</p>
                    <p><strong>3.</strong> Clique em "Add User"</p>
                    <p><strong>4.</strong> Email: <code className="bg-red-200 px-1 rounded font-mono">admin@zkpremios.com</code></p>
                    <p><strong>5.</strong> Senha: <code className="bg-red-200 px-1 rounded font-mono">admin123</code></p>
                    <p><strong>6.</strong> ✅ Marque "Confirm email" como true</p>
                    <p><strong>7.</strong> Clique em "Create User"</p>
                    <p><strong>8.</strong> Depois vá na tabela `users` e defina `is_admin=true`</p>
                  </div>
                </div>
              </div>
            )}
            
            {!error && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm">
                  <p className="font-semibold mb-2 text-blue-800">💡 Credenciais do Admin:</p>
                  <div className="text-blue-700 space-y-1">
                    <p>Email: <code className="bg-blue-100 px-2 py-1 rounded font-mono">admin@zkpremios.com</code></p>
                    <p>Senha: <code className="bg-blue-100 px-2 py-1 rounded font-mono">admin123</code></p>
                  </div>
                </div>
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="appearance-none rounded-lg relative block w-full px-4 py-3 pr-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <LogIn className="h-5 w-5 text-primary-dark group-hover:text-primary" aria-hidden="true" />
                </span>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta de admin?{' '}
                <a href="/admin/register" className="text-primary hover:text-primary-dark font-medium">
                  Cadastre-se aqui
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}