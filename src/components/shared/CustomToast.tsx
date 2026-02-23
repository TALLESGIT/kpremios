import React from 'react';
import { CheckCircle, XCircle, Clock, Crown } from 'lucide-react';

interface CustomToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

const CustomToast: React.FC<CustomToastProps> = ({ type, title, message }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-600 to-green-700',
          border: 'border-2 border-green-400/50',
          icon: <CheckCircle className="w-6 h-6 text-white" />
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-700 to-red-800',
          border: 'border-2 border-red-400/50',
          icon: <XCircle className="w-6 h-6 text-white" />
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-600 to-amber-700',
          border: 'border-2 border-amber-400/50',
          icon: <Clock className="w-6 h-6 text-white" />
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-blue-700',
          border: 'border-2 border-blue-400/50',
          icon: <Crown className="w-6 h-6 text-white" />
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-slate-600 to-slate-700',
          border: 'border-2 border-slate-400/50',
          icon: null
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} ${styles.border} rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl min-w-[300px] max-w-[90vw]`}>
      {/* Logo circular ZK */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center relative">
          <span className="text-white font-black text-lg">ZK</span>
          {/* Estrelas */}
          <span className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-white text-xs">★</span>
          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-white text-xs">★</span>
        </div>
      </div>
      
      {/* Texto */}
      <div className="flex-1">
        <div className="text-white font-black text-sm uppercase leading-tight">
          {title}
        </div>
        {message && (
          <div className="text-white/90 font-bold text-xs mt-1 uppercase">
            {message}
          </div>
        )}
      </div>
      
      {/* Ícone */}
      {styles.icon && (
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
      )}
    </div>
  );
};

export default CustomToast;

