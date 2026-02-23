import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Phone, ArrowRight, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

const ForgotEmailPage: React.FC = () => {
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailFound, setEmailFound] = useState<string | null>(null);
  const navigate = useNavigate();

  const formatWhatsApp = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    return numbers;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  // Normalizar WhatsApp para busca (remove caracteres não numéricos)
  const normalizeWhatsApp = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  // Gerar variações do WhatsApp para busca
  const getWhatsAppVariations = (phone: string): string[] => {
    const normalized = normalizeWhatsApp(phone);
    const variations: string[] = [normalized];

    // Se começa com 55 (código do Brasil), tentar sem o 55
    if (normalized.startsWith('55') && normalized.length > 12) {
      variations.push(normalized.substring(2));
    }

    // Se não começa com 55 e tem 11 dígitos, tentar com 55
    if (!normalized.startsWith('55') && normalized.length === 11) {
      variations.push('55' + normalized);
    }

    // Se tem 10 dígitos (sem DDD), tentar adicionar DDDs comuns
    if (normalized.length === 10) {
      const commonDDDs = ['11', '21', '31', '41', '47', '48', '51', '61', '71', '81', '85'];
      commonDDDs.forEach(ddd => {
        variations.push(ddd + normalized);
        variations.push('55' + ddd + normalized);
      });
    }

    // Remover duplicatas
    return [...new Set(variations)];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setEmailFound(null);

    if (!whatsapp.trim() || whatsapp.length < 10) {
      setError('WhatsApp inválido. Digite pelo menos 10 dígitos.');
      setLoading(false);
      return;
    }

    try {
      // Gerar variações do WhatsApp
      const variations = getWhatsAppVariations(whatsapp);

      // Tentar buscar com cada variação
      let userFound = null;
      let lastError = null;

      for (const variation of variations) {
        const { data, error: queryError } = await supabase
          .from('users')
          .select('email, name')
          .eq('whatsapp', variation)
          .maybeSingle();

        if (queryError) {
          lastError = queryError;
          continue;
        }

        if (data) {
          userFound = data;
          break;
        }
      }

      // Se não encontrou, tentar busca com LIKE (mais flexível)
      if (!userFound) {
        const normalized = normalizeWhatsApp(whatsapp);
        // Buscar WhatsApps que contenham os últimos 9 dígitos (número sem DDD)
        if (normalized.length >= 9) {
          const lastDigits = normalized.slice(-9);
          const { data: likeData, error: likeError } = await supabase
            .from('users')
            .select('email, name, whatsapp')
            .ilike('whatsapp', `%${lastDigits}%`)
            .limit(5);

          if (!likeError && likeData && likeData.length > 0) {
            // Verificar qual corresponde melhor
            for (const user of likeData) {
              const userNormalized = normalizeWhatsApp(user.whatsapp);
              if (userNormalized.endsWith(normalized) || normalized.endsWith(userNormalized)) {
                userFound = { email: user.email, name: user.name };
                break;
              }
            }
          }
        }
      }

      if (lastError && !userFound) {
        console.error('Erro ao buscar usuário:', lastError);
        setError('Erro ao buscar conta. Tente novamente.');
        setLoading(false);
        return;
      }

      if (!userFound) {
        // Por segurança, não revelamos se o WhatsApp existe ou não
        // Mas orientamos o usuário sobre contas antigas
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Enviar email com o email cadastrado
      const { error: emailError } = await supabase.auth.resetPasswordForEmail(userFound.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Mesmo com erro no envio, mostramos o email encontrado
        setEmailFound(userFound.email);
        setSuccess(true);
      } else {
        setEmailFound(userFound.email);
        setSuccess(true);
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
      console.error('Erro ao recuperar email:', error);
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
            {/* Header Area */}
            <div className="relative bg-primary/20 p-8 text-center border-b border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-md border border-white/20 shadow-lg group">
                <Phone className="h-8 w-8 text-accent group-hover:scale-110 transition-transform" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Recuperar Email</h1>
              <p className="text-blue-200 text-sm mt-1">Informe seu WhatsApp para recuperar seu email</p>
            </div>

            {/* Form Area */}
            <div className="p-8 bg-black/20 backdrop-blur-md">
              {success ? (
                <div className="space-y-6">
                  {emailFound ? (
                    <>
                      <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-xl flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Email encontrado!</p>
                          <p className="text-xs mt-1 text-green-200/80">
                            Seu email cadastrado é:
                          </p>
                          <p className="text-sm font-bold mt-2 text-green-200">
                            {emailFound}
                          </p>
                          <p className="text-xs mt-2 text-green-200/80">
                            Enviamos um link de recuperação de senha para este email.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium">Conta não encontrada</p>
                        <p className="text-xs text-blue-200/80">
                          Não encontramos uma conta cadastrada com este WhatsApp.
                        </p>
                        <div className="mt-3 pt-3 border-t border-blue-500/20">
                          <p className="text-xs font-semibold text-blue-200 mb-2">
                            Sua conta foi criada antes do WhatsApp ser obrigatório?
                          </p>
                          <p className="text-xs text-blue-200/80 mb-3">
                            Se você lembra seu email, pode recuperar a senha diretamente pelo email:
                          </p>
                          <button
                            onClick={() => navigate('/forgot-password')}
                            className="w-full py-2 px-4 rounded-lg border border-blue-500/30 text-blue-200 hover:bg-blue-500/10 transition-colors text-xs font-medium"
                          >
                            Recuperar senha pelo email
                          </button>
                        </div>
                        <p className="text-xs text-blue-200/60 mt-3">
                          Ou verifique se digitou o WhatsApp corretamente e tente novamente.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full btn btn-primary py-3 rounded-xl flex items-center justify-center gap-2 group"
                    >
                      <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      <span>Voltar para o login</span>
                    </button>

                    {emailFound && (
                      <button
                        onClick={() => navigate('/forgot-password')}
                        className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors text-sm"
                      >
                        Não recebeu o email? Reenviar
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmailFound(null);
                        setWhatsapp('');
                      }}
                      className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors text-sm"
                    >
                      Tentar com outro WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="whatsapp" className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
                      WhatsApp Cadastrado
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                      </div>
                      <input
                        id="whatsapp"
                        type="tel"
                        value={whatsapp}
                        onChange={handleWhatsAppChange}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                        placeholder="11987654321"
                        required
                        disabled={loading}
                        maxLength={15}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Digite apenas números (ex: 11987654321)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn btn-primary py-4 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <span>Recuperar Email</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-slate-400 text-sm">
                  Lembrou seu email?{' '}
                  <Link
                    to="/forgot-password"
                    className="text-accent hover:text-white font-bold transition-colors ml-1"
                  >
                    Recuperar senha
                  </Link>
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Já tem acesso?{' '}
                  <Link
                    to="/login"
                    className="text-accent hover:text-white font-bold transition-colors ml-1"
                  >
                    Fazer login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

    </>
  );
};

export default ForgotEmailPage;

