import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { Send, Loader2, Mail, User, Phone, Eye, EyeOff, Shield } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { ZKLogo } from '../components/shared/ZKLogo';

export default function AdminRegisterPage() {
  const { registerAdmin, convertToAdmin } = useData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Try to register as new admin first
      await registerAdmin(formData.name, formData.email, formData.whatsapp, formData.password);
      
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (error: any) {

      // If user already exists, try to convert to admin
      if (error.message.includes('já está cadastrado') || 
          error.message.includes('already registered') ||
          error.message.includes('email-already-in-use')) {
        try {

          await convertToAdmin(formData.name, formData.email, formData.whatsapp, formData.password);
          
          // Redirect to admin dashboard
          navigate('/admin/dashboard');
        } catch (convertError: any) {

          setErrors({ general: convertError.message || 'Erro ao converter usuário para admin' });
        }
      } else {
        setErrors({ general: error.message || 'Erro ao criar conta de administrador' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-blue-200">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex justify-center mb-6"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-2">
              Cadastro de Administrador
            </h2>
            <p className="text-gray-600 text-center mb-8 text-sm sm:text-base">
              Crie uma conta de administrador para gerenciar o sistema
            </p>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-red-600">{errors.general}</h3>
                  </div>
                </div>
              </motion.div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
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
                    required
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 bg-blue-50 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Digite seu nome completo"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
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
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 bg-blue-50 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Digite seu email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-300 mb-2">
                  WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    required
                    autoComplete="tel"
                    className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 bg-blue-50 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={handleChange}
                  />
                </div>
                {errors.whatsapp && <p className="mt-1 text-sm text-red-400">{errors.whatsapp}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 border-2 border-blue-200 bg-blue-50 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all duration-200 ${
                  !loading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Criando Admin...
                  </>
                ) : (
                  <>
                    Criar Conta de Admin
                    <Send size={20} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Já tem uma conta?{' '}
                <a href="/admin/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Faça login aqui
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
