import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Hash, Star } from 'lucide-react';
import { RaffleNumber } from '../../types';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

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
  const [gameStatus, setGameStatus] = useState<'open' | 'closed'>('open');
  const [activeRaffle, setActiveRaffle] = useState<any>(null);
  const numbersPerPage = 100;

  // Create ranges for pagination based on active raffle
  const numberRanges: Array<{ start: number; end: number; label: string }> = [];
  const maxNumbers = activeRaffle?.total_numbers || 1000;
  for (let i = 1; i <= maxNumbers; i += numbersPerPage) {
    const end = Math.min(i + numbersPerPage - 1, maxNumbers);
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
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('raffles')
        .select('id, total_numbers, title, prize, game_status')
        .eq('is_active', true)
        .limit(1);

      if (error) {
        setHasActiveRaffle(false);
        setActiveRaffle(null);
        setGameStatus('open');
      } else {
        setHasActiveRaffle(data && data.length > 0);
        setActiveRaffle(data && data.length > 0 ? data[0] : null);
        if (data && data.length > 0) {
          setGameStatus(data[0].game_status || 'open');
        } else {
          setGameStatus('open');
        }
      }
    } catch (error) {
      setHasActiveRaffle(false);
      setActiveRaffle(null);
      setGameStatus('open');
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
    if (currentAppUser?.is_admin) {
      alert('Administradores não podem participar dos sorteios!');
      return;
    }

    if (gameStatus === 'closed') {
      alert('🔒 O jogo está fechado para sorteio manual. Não é possível escolher números no momento.');
      return;
    }

    if (currentAppUser?.free_number) {
      return;
    }

    const numberData = numbers.find(n => n.number === number);
    if (numberData?.is_available) {
      onSelectNumber(number);

      setTimeout(() => {
        const formElement = document.getElementById('registration-form');
        if (formElement) {
          formElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 300);
    }
  };

  const handleRangeChange = (index: number) => {
    setCurrentRange(index);
  };

  const getNumberClass = (numberData: RaffleNumber) => {
    // Current user selected (temporary)
    if (selectedNumber === numberData.number) {
      return 'bg-gradient-to-br from-accent to-yellow-600 text-primary-dark border-accent shadow-lg shadow-accent/40 transform scale-110 font-black z-10';
    }

    // Current user confirmed
    if (currentAppUser && (currentAppUser.free_number === numberData.number || currentAppUser.id === numberData.selected_by)) {
      return 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg shadow-green-500/40 transform scale-105 font-black ring-2 ring-green-400/50';
    }

    // Not available
    if (!numberData.is_available) {
      return 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-60';
    }

    // Available
    return 'bg-white/10 border-white/10 text-white hover:border-accent hover:text-accent hover:bg-white/20 hover:shadow-lg hover:shadow-accent/20 transform hover:scale-110 backdrop-blur-sm transition-all duration-200';
  };

  if (numbersLoading || loadingActiveRaffle) {
    return (
      <div className="py-16 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-light border-t-accent mx-auto mb-4"></div>
          <p className="text-blue-200 font-medium animate-pulse">
            {numbersLoading ? 'Carregando números...' : 'Verificando sorteios...'}
          </p>
        </div>
      </div>
    );
  }

  if (!hasActiveRaffle) {
    return (
      <div className="py-12 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
          <Star className="w-10 h-10 text-accent opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Nenhum sorteio ativo
        </h2>
        <p className="text-blue-200 max-w-lg mx-auto mb-8">
          Aguarde o próximo jogo do Cruzeiro para novos sorteios!
        </p>
        <Link to="/user-dashboard" className="btn btn-outline border-white/20 hover:bg-white/10 text-white">
          Ir para meu Painel
        </Link>
      </div>
    );
  }

  const userHasNumber = currentAppUser?.free_number;

  return (
    <div id="number-selection" className="py-4">
      <div className="max-w-7xl mx-auto">
        {userHasNumber && (
          <div className="mb-8 bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-6 rounded-r-xl backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                <Star className="w-6 h-6 fill-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Número Garantido!</h3>
                <p className="text-blue-200">
                  Seu número da sorte é <span className="text-accent font-black text-xl">#{currentAppUser.free_number}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="mb-8 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="flex overflow-x-auto no-scrollbar p-2 gap-2">
            {numberRanges.map((range, index) => (
              <button
                key={index}
                onClick={() => handleRangeChange(index)}
                className={`py-2 px-6 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${currentRange === index
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-blue-300 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-3">
          {filteredNumbers.map((numberData) => (
            <button
              key={numberData.number}
              onClick={() => handleNumberClick(numberData.number)}
              onMouseEnter={() => setHoveredNumber(numberData.number)}
              onMouseLeave={() => setHoveredNumber(null)}
              disabled={!numberData.is_available && selectedNumber !== numberData.number}
              className={`
                relative aspect-square rounded-xl border font-bold text-sm sm:text-base flex items-center justify-center
                ${getNumberClass(numberData)}
              `}
            >
              {numberData.number}
              {!numberData.is_available && selectedNumber !== numberData.number && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  {hoveredNumber === numberData.number ? (
                    <Lock className="w-4 h-4 text-white/80" />
                  ) : (
                    <X className="w-4 h-4 text-white/30" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredNumbers.length === 0 && (
          <div className="text-center py-12 text-blue-300">
            <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum número nesta página</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NumberSelection;