import { ArrowRight, Gift, Zap } from 'lucide-react';
import { useState } from 'react';
import { ZKLogo } from '../shared/ZKLogo';
import ExtraNumbersModal from './ExtraNumbersModal';
import { useData } from '../../context/DataContext';

function Banner() {
  const [showExtraModal, setShowExtraModal] = useState(false);
  const { currentUser } = useData();

  return (
    <>
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Geometric Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Geometric Accent Lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
        <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="px-2 sm:px-4 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              {/* Content */}
              <div className="text-center lg:text-left">
                <div className="flex justify-center lg:justify-start mb-4 sm:mb-8">
                  <ZKLogo size="lg" className="animate-pulse" />
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-7xl font-black text-white mb-4 sm:mb-6 leading-tight tracking-tight">
                  <span className="block">Concorra a</span>
                  <span className="block relative">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
                      R$ 10.000,00
                    </span>
                    <div className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"></div>
                  </span>
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0">
                  Escolha seu número da sorte <strong className="text-amber-400">GRÁTIS</strong>, 
                  preencha seus dados e concorra a prêmios incríveis em dinheiro!
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-2 sm:px-0">
                  {currentUser?.is_admin ? (
                    <a
                      href="/admin/dashboard"
                      className="group relative inline-flex items-center justify-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-2xl hover:shadow-red-500/25 transform hover:-translate-y-1 hover:scale-105 overflow-hidden text-sm sm:text-base"
                    >
                      {/* Geometric accent */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-300 to-red-400"></div>
                      <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-red-300 to-red-400"></div>
                      
                      <span className="relative z-10">
                        Painel Administrativo
                      </span>
                      <ArrowRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </a>
                  ) : (
                    <a
                      href="#number-selection"
                      className="group relative inline-flex items-center justify-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-black rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105 overflow-hidden text-sm sm:text-base"
                    >
                      {/* Geometric accent */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 to-amber-400"></div>
                      <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-300 to-amber-400"></div>
                      
                      <span className="relative z-10">
                        {currentUser?.free_number ? 'Ver Meu Número' : 'Escolher Número Grátis'}
                      </span>
                      <ArrowRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </a>
                  )}
                </div>

                {/* Info Card */}
                <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-2xl border border-amber-400/30 backdrop-blur-sm mx-2 sm:mx-0">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-slate-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {currentUser?.is_admin ? (
                        <>
                          <h3 className="text-red-400 font-bold text-base sm:text-lg mb-1 sm:mb-2">
                            🔧 Acesso Administrativo
                          </h3>
                          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                            Você é um administrador do sistema. Acesse o <strong className="text-red-400">Painel Administrativo</strong> para gerenciar sorteios, usuários e configurações.
                          </p>
                        </>
                      ) : !currentUser?.free_number ? (
                        <>
                          <h3 className="text-amber-100 font-bold text-base sm:text-lg mb-1 sm:mb-2">
                            Primeiro, escolha seu número <span className="text-amber-400">GRÁTIS</span>!
                          </h3>
                          <p className="text-amber-200 text-xs sm:text-sm leading-relaxed font-medium">
                            Comece participando <strong className="text-amber-400">gratuitamente</strong>! 
                            Escolha um número de 1 a 1000 e concorra ao prêmio.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-green-400 font-bold text-base sm:text-lg mb-1 sm:mb-2">
                            🎉 Número escolhido com sucesso!
                          </h3>
                          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                            Seu número <strong className="text-green-400">#{currentUser.free_number}</strong> está reservado! 
                            Acesse <strong className="text-green-400">"Meus Números"</strong> para solicitar números extras.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual */}
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full blur-3xl"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-12 border border-slate-700">
                    <div className="text-center">
                      <ZKLogo size="lg" className="mx-auto mb-6 scale-[2]" />
                      <div className="space-y-4">
                        {currentUser?.is_admin ? (
                          <>
                            <div className="flex justify-center">
                              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                                🔧
                              </div>
                            </div>
                            <p className="text-slate-400 text-sm">Painel Administrativo</p>
                          </>
                        ) : currentUser?.free_number ? (
                          <>
                            <div className="flex justify-center">
                              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-xl">
                                {currentUser.free_number}
                              </div>
                            </div>
                            <p className="text-slate-400 text-sm">Seu número da sorte</p>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-center">
                              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-xl">
                                ?
                              </div>
                            </div>
                            <p className="text-slate-400 text-sm">Escolha seu número da sorte</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

export default Banner;