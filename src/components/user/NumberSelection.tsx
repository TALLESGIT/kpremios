import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Hash } from 'lucide-react';
import { RaffleNumber } from '../../types';
import { supabase } from '../../lib/supabase';

interface NumberSelectionProps {
  onSelectNumber: (number: number) => void;
  selectedNumber: number | null;
}

function NumberSelection({ onSelectNumber, selectedNumber }: NumberSelectionProps) {
  const { numbers, numbersLoading } = useData();
  const { currentUser: currentAppUser } = useData();
  const [filteredNumbers, setFilteredNumbers] = useState<RaffleNumber[]>([]);
  const [currentRange, setCurrentRange] = useState(0);
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);
  const [hasActiveRaffle, setHasActiveRaffle] = useState<boolean>(false);
  const [loadingActiveRaffle, setLoadingActiveRaffle] = useState(true);
  const numbersPerPage = 100;

  // Create ranges for pagination
  const numberRanges: Array<{ start: number; end: number; label: string }> = [];
  for (let i = 1; i <= 1000; i += numbersPerPage) {
    const end = Math.min(i + numbersPerPage - 1, 1000);
    numberRanges.push({ start: i, end, label: `${i}-${end}` });
  }

  // Verificar se há sorteios ativos
  useEffect(() => {
    checkActiveRaffles();
  }, []);

  // Subscription em tempo real para mudanças nos sorteios
  useEffect(() => {
    const subscription = supabase
      .channel('active-raffles-check')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'raffles'
      }, () => {
        checkActiveRaffles();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkActiveRaffles = async () => {
    try {
      console.log('Checking for active raffles...');
      
      // Verificar se há usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user for raffles check:', user?.id ? 'authenticated' : 'not authenticated');
      
      const { data, error } = await supabase
        .from('raffles')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar sorteios ativos:', error);
        setHasActiveRaffle(false);
      } else {
        console.log('Active raffles check result:', data);
        setHasActiveRaffle(data && data.length > 0);
      }
    } catch (error) {
      console.error('Erro ao verificar sorteios ativos:', error);
      setHasActiveRaffle(false);
    } finally {
      setLoadingActiveRaffle(false);
    }
  };

  // Filter numbers based on current range
  useEffect(() => {
    if (!numbers.length) return;
    
    const rangeStart = numberRanges[currentRange]?.start || 1;
    const rangeEnd = numberRanges[currentRange]?.end || 100;
    
    const filtered = numbers.filter(num => 
      num.number >= rangeStart && num.number <= rangeEnd
    );
    
    setFilteredNumbers(filtered);
  }, [numbers, currentRange]);

  const handleNumberClick = (number: number) => {
    // Don't allow selection if user is admin
    if (currentAppUser?.is_admin) {
      alert('Administradores não podem participar dos sorteios!');
      return;
    }
    
    // Don't allow selection if user already has a free number
    if (currentAppUser?.free_number) {
      return;
    }
    
    const numberData = numbers.find(n => n.number === number);
    if (numberData?.is_available) {
      onSelectNumber(number);
      
      // Scroll to registration form with better timing
      setTimeout(() => {
        const formElement = document.getElementById('registration-form');
        if (formElement) {
          console.log('Scrolling to registration form...');
          formElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        } else {
          console.log('Registration form not found, trying alternative...');
          // Try to scroll to the form section
          const formSection = document.querySelector('section[id="registration-form"]');
          if (formSection) {
            formSection.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      }, 300);
    }
  };

  const handleRangeChange = (index: number) => {
    setCurrentRange(index);
  };

  const getNumberClass = (numberData: RaffleNumber) => {
    // Número temporariamente selecionado pelo usuário atual (ainda não confirmado)
    if (selectedNumber === numberData.number) {
      return 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-900 border-amber-400 shadow-2xl shadow-amber-500/25 transform scale-105 font-black';
    }
    
    // Número definitivamente selecionado pelo usuário atual (já confirmado)
    if (currentAppUser && (currentAppUser.free_number === numberData.number || currentAppUser.id === numberData.selected_by)) {
      return 'bg-gradient-to-br from-red-600 to-red-700 text-white border-red-500 shadow-2xl shadow-red-500/25 transform scale-105 font-black';
    }
    
    // Número não disponível (já selecionado por outro usuário)
    if (!numberData.is_available) {
      return 'bg-gradient-to-br from-red-600 to-red-700 text-white border-red-500 cursor-not-allowed relative overflow-hidden shadow-lg opacity-80';
    }
    
    // Número disponível
    return 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-amber-400 hover:text-amber-400 hover:bg-slate-700/50 hover:shadow-lg hover:shadow-amber-500/10 transform hover:scale-105 backdrop-blur-sm font-bold';
  };

  if (numbersLoading || loadingActiveRaffle) {
    return (
      <div className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500 mx-auto"></div>
          <p className="mt-6 text-amber-200 font-medium text-lg">
            {numbersLoading ? 'Carregando números...' : 'Verificando sorteios ativos...'}
          </p>
        </div>
      </div>
    );
  }

  // Se não há sorteios ativos, não exibir a seleção de números
  if (!hasActiveRaffle) {
    return (
      <div className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎯</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 sm:mb-6 tracking-tight">
            Nenhum sorteio ativo no momento
          </h2>
          <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-slate-300 font-medium leading-relaxed px-2 sm:px-0 mb-6">
            Não há sorteios ativos disponíveis para participação no momento. 
            Fique atento para novos sorteios em breve!
          </p>
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-400/30 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <p className="text-amber-200 font-medium">
              💡 <strong>Dica:</strong> Acesse o dashboard para ver suas estatísticas e atividades recentes!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show info if user already selected a number, but still show the grid
  const userHasNumber = currentAppUser?.free_number;

  return (
    <div id="number-selection" className="py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Show info if user already has a number */}
        {userHasNumber && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-400/30 rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-amber-100 mb-1 sm:mb-2">Número Já Selecionado!</h3>
            <p className="text-amber-200 mb-1 sm:mb-2">
              Seu número gratuito: <span className="font-black text-2xl sm:text-3xl text-amber-400">#{currentAppUser.free_number}</span>
            </p>
            <p className="text-xs sm:text-sm text-amber-300 font-medium">
              Quer mais chances de ganhar? Solicite números extras no banner acima!
            </p>
          </div>
        )}
        
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tight">
            Escolha seu número da sorte
          </h2>
          <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-slate-300 font-medium leading-relaxed px-2 sm:px-0">
            Selecione um número disponível entre <span className="text-amber-400 font-bold">1 e 1000</span>. 
            Você tem direito a <span className="text-amber-400 font-bold">1 número gratuito</span>!
          </p>
        </div>

        <div className="max-w-6xl mx-auto">

          {/* Range tabs */}
          <div className="mb-6 sm:mb-8">
            <div className="border-b border-amber-400/20">
              <div className="flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-2">
                {numberRanges.map((range, index) => (
                  <button
                    key={index}
                    onClick={() => handleRangeChange(index)}
                    className={`py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-bold rounded-t-xl transition-all duration-300 whitespace-nowrap ${
                      currentRange === index
                        ? 'border-b-2 border-amber-500 text-amber-100 bg-amber-500/20 backdrop-blur-sm'
                        : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Number grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
            {filteredNumbers.map((numberData) => (
              <button
                key={numberData.number}
                onClick={() => handleNumberClick(numberData.number)}
                onMouseEnter={() => setHoveredNumber(numberData.number)}
                onMouseLeave={() => setHoveredNumber(null)}
                disabled={!numberData.is_available && selectedNumber !== numberData.number}
                className={`
                  relative h-10 sm:h-12 lg:h-14 w-full rounded-xl border-2 text-xs sm:text-sm font-bold transition-all duration-200
                  flex items-center justify-center
                  ${getNumberClass(numberData)}
                `}
              >
                {numberData.number}
                {!numberData.is_available && 
                 selectedNumber !== numberData.number && (
                  <div className={`absolute inset-0 flex items-center justify-center rounded-xl transition-all duration-200 ${
                    hoveredNumber === numberData.number 
                      ? 'bg-red-600/60 backdrop-blur-sm' 
                      : 'bg-black/40'
                  }`}>
                    {hoveredNumber === numberData.number ? (
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white font-bold animate-pulse" />
                    ) : (
                      <X className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white font-bold" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredNumbers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Hash className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 text-base sm:text-lg font-medium">Nenhum número nesta faixa</p>
              <p className="text-slate-500 text-sm sm:text-base">Tente selecionar outra faixa de números</p>
            </div>
          )}

          {selectedNumber && (
            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
              <div className="flex items-center justify-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <h3 className="text-base sm:text-lg font-bold text-green-800">
                    Número selecionado: <span className="text-xl sm:text-2xl text-amber-600">#{selectedNumber}</span>
                  </h3>
                  <p className="text-green-700 text-sm sm:text-base">
                    Preencha o formulário abaixo para confirmar sua escolha e garantir sua participação!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NumberSelection;