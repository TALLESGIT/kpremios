import React from 'react';

interface Participant {
  id: string;
  user_id: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  eliminated_at?: string;
  user_name?: string;
}

interface LiveGameNumberGridProps {
  participants: Participant[];
  currentUserId?: string;
  onNumberClick?: (number: number) => void;
  disabled?: boolean;
  maxNumbers?: number;
}

const LiveGameNumberGrid: React.FC<LiveGameNumberGridProps> = ({
  participants,
  currentUserId,
  onNumberClick,
  disabled = false,
  maxNumbers = 50
}) => {
  const getNumberStatus = (number: number) => {
    const participant = participants.find(p => p.lucky_number === number);
    
    if (!participant) {
      return 'available';
    }
    
    if (participant.user_id === currentUserId) {
      return participant.status === 'eliminated' ? 'my-eliminated' : 'my-selected';
    }
    
    return participant.status === 'eliminated' ? 'eliminated' : 'taken';
  };

  const getNumberClass = (number: number) => {
    const status = getNumberStatus(number);
    
    switch (status) {
      case 'available':
        return 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 cursor-pointer';
      case 'my-selected':
        return 'bg-green-500 text-white border-2 border-green-400 shadow-lg shadow-green-200 font-bold';
      case 'my-eliminated':
        return 'bg-red-500 text-white border-2 border-red-400 shadow-lg shadow-red-200 font-bold line-through';
      case 'taken':
        return 'bg-purple-500 text-white border-2 border-purple-400 shadow-lg shadow-purple-200 font-bold';
      case 'eliminated':
        return 'bg-red-500 text-white border-2 border-red-400 shadow-lg shadow-red-200 font-bold line-through opacity-60';
      default:
        return 'bg-gray-100 text-gray-700 border-2 border-gray-200';
    }
  };

  const getNumberIcon = (number: number) => {
    const status = getNumberStatus(number);
    
    switch (status) {
      case 'my-selected':
        return '✅';
      case 'my-eliminated':
        return '💀';
      case 'taken':
        return '👤';
      case 'eliminated':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid de Números */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
        {Array.from({ length: maxNumbers }, (_, i) => {
          const number = i + 1;
          const status = getNumberStatus(number);
          const canClick = status === 'available' && !disabled && onNumberClick;
          
          return (
            <button
              key={number}
              onClick={() => canClick && onNumberClick(number)}
              disabled={!canClick}
              className={`
                w-12 h-12 sm:w-14 sm:h-14 rounded-lg font-bold text-sm sm:text-base 
                transition-all duration-200 flex items-center justify-center relative
                ${getNumberClass(number)}
                ${canClick ? 'hover:scale-105 active:scale-95' : 'cursor-not-allowed'}
                ${disabled ? 'opacity-50' : ''}
              `}
            >
              <span className="flex items-center gap-1">
                {getNumberIcon(number)}
                <span>{number}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
          <span className="text-gray-600">Disponível</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-500 border-2 border-purple-400 rounded"></div>
          <span className="text-gray-600">Escolhido</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 border-2 border-green-400 rounded"></div>
          <span className="text-gray-600">Seu número</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 border-2 border-red-400 rounded"></div>
          <span className="text-gray-600">Eliminado</span>
        </div>
      </div>
    </div>
  );
};

export default LiveGameNumberGrid;
