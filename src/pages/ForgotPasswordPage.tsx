import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowRight, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Email é obrigatório');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        if (resetError.message.includes('rate limit')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (resetError.message.includes('not found')) {
          // Por segurança, não revelamos se o email existe ou não
          setSuccess(true);
        } else {
          setError(`Erro ao enviar email: ${resetError.message}`);
        }
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
      console.error('Erro ao recuperar senha:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden bg-primary-dark/30">
        {/* Advanced Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.2),transparent_50%)]"></div>
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-accent/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-700">
          <div className="glass-panel-heavy rounded-[3rem] overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.6)] border border-white/10 backdrop-blur-3xl bg-white/5">
            {/* Premium Header Area */}
            <div className="relative p-10 pt-12 text-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-white/15 to-white/5 rounded-[2rem] mb-8 backdrop-blur-2xl border border-white/20 shadow-2xl relative group">
                <div className="absolute inset-0 bg-accent rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <Mail className="h-12 w-12 text-accent group-hover:scale-110 transition-transform relative z-10 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase italic leading-none drop-shadow-lg">
                Recuperar <span className="text-accent">Senha</span>
              </h1>
              <p className="text-blue-100/60 text-sm font-medium tracking-wide max-w-[200px] mx-auto leading-relaxed">
                Enviaremos um link de acesso seguro para seu email
              </p>
            </div>

            {/* Content Area */}
            <div className="px-10 pb-12">
              {success ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-8 rounded-[2rem] flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center shadow-inner">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-black uppercase tracking-wider mb-2">Email Enviado!</p>
                      <p className="text-xs text-emerald-100/60 leading-relaxed font-medium">
                        Se este email estiver cadastrado, o link chegará em instantes. Verifique também sua caixa de Spam.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-white text-primary-dark py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl hover:bg-blue-50 transition-all active:scale-95"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Voltar ao Login</span>
                    </button>

                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail('');
                      }}
                      className="w-full py-4 rounded-2xl border border-white/5 text-white/40 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-[0.3em]"
                    >
                      Tentar Outro Email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider leading-none">{error}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label htmlFor="email" className="block text-[10px] font-black text-accent uppercase tracking-[0.3em] ml-2 opacity-80">
                      Email Vinculado
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all font-bold text-sm tracking-wide relative z-10 hover:bg-white/[0.08]"
                        placeholder="exemplo@email.com"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30 hover:from-blue-500 hover:to-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <span>Solicitar Link</span>
                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center gap-5">
                <Link
                  to="/login"
                  className="text-[10px] font-black text-white/30 hover:text-accent uppercase tracking-[0.3em] transition-all hover:tracking-[0.35em]"
                >
                  Lembrou? <span className="text-white font-black underline decoration-accent/50 underline-offset-4 ml-1">ENTRAR</span>
                </Link>
                <Link
                  to="/forgot-email"
                  className="text-[10px] font-black text-white/20 hover:text-blue-400 uppercase tracking-[0.3em] transition-all"
                >
                  Não lembra o email?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

    </>
  );
};

export default ForgotPasswordPage;

