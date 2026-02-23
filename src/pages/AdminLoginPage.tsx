import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

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
        navigate('/admin/dashboard');
      } else {
        if (signInError.message === 'Invalid login credentials') {
          setError('Credenciais inválidas');
        } else if (signInError.message === 'Email not confirmed') {
          setError('Email não confirmado.');
        } else if (signInError.message === 'Too many requests') {
          setError('Muitas tentativas. Aguarde.');
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-background to-black opacity-90"></div>

        <div className="max-w-md w-full relative z-10">
          <div className="glass-panel rounded-3xl shadow-2xl overflow-hidden border border-white/10">
            <div className="bg-primary/20 p-8 text-center border-b border-white/5 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Área Administrativa</h2>
              <p className="text-blue-200 text-sm mt-1">Acesso restrito a gerenciadores</p>
            </div>

            <div className="p-8 bg-black/20 backdrop-blur-md">
              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-200 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    {error}
                  </p>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2 pl-1">
                    Email de Acesso
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    placeholder="admin@zkoficial.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-2 pl-1">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white transition-colors"
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <LogIn className="h-5 w-5 text-primary-dark group-hover:text-primary transition-colors" />
                  </span>
                  {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-xs text-white/40">
                  Protegido por ZK Oficial Security
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}