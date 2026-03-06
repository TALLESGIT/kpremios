import React from 'react';
import '../../styles/loading-animations.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray' | 'green' | 'red';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  variant = 'spinner',
  className = ''
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Color classes
  const colorClasses = {
    blue: 'border-blue-500 text-blue-500',
    white: 'border-white text-white',
    gray: 'border-gray-500 text-gray-500',
    green: 'border-green-500 text-green-500',
    red: 'border-red-500 text-red-500'
  };

  // Dot size for dots variant
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
    xl: 'w-3 h-3'
  };

  // Bar sizes for bars variant
  const barSizes = {
    sm: 'w-0.5 h-3',
    md: 'w-1 h-4',
    lg: 'w-1 h-6',
    xl: 'w-1.5 h-8'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={`${sizeClasses[size]} ${className}`}>
            <div className={`w-full h-full border-2 border-gray-200 border-t-current rounded-full animate-spin ${colorClasses[color]}`}></div>
          </div>
        );

      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className={`${dotSizes[size]} bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${dotSizes[size]} bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${dotSizes[size]} bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );

      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} ${className}`}>
            <div className={`w-full h-full bg-current rounded-full animate-pulse ${colorClasses[color]}`}></div>
          </div>
        );

      case 'bars':
        return (
          <div className={`flex items-end space-x-1 ${className}`}>
            <div className={`${barSizes[size]} bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${barSizes[size]} bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${barSizes[size]} bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '300ms' }}></div>
            <div className={`${barSizes[size]} bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '450ms' }}></div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderSpinner();
};

// Componente de botão com loading integrado
interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  loadingText?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  isLoading = false,
  disabled = false,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  loadingText = 'Carregando...'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 disabled:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm';
  const spinnerColor = variant === 'outline' ? 'blue' : 'white';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${(disabled || isLoading) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
    >
      {isLoading && (
        <LoadingSpinner 
          size={spinnerSize} 
          color={spinnerColor} 
          className="mr-2" 
        />
      )}
      {isLoading ? loadingText : children}
    </button>
  );
};

export default LoadingSpinner;