import React from 'react';
import '../../styles/loading-animations.css';

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Carregando...", 
  showLogo = true 
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center z-50">
      <div className="text-center px-6 py-8">
        {/* Logo/Icon */}
        {showLogo && (
          <div className="mb-8 flex justify-center">
            <div className="relative">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping"></div>
              <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-pulse"></div>
              
              {/* Main logo container */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 md:w-8 md:h-8 text-blue-500" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading message */}
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 animate-pulse">
            {message}
          </h2>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-8 w-full max-w-xs mx-auto">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Subtle hint text */}
        <p className="mt-6 text-sm text-gray-500 animate-pulse">
          Preparando sua experiência...
        </p>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300 rounded-full animate-float opacity-60"></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-blue-200 rounded-full animate-float-delayed opacity-40"></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-blue-400 rounded-full animate-float opacity-80"></div>
        
        {/* Gradient orbs */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-100 to-transparent rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-gradient-to-tl from-blue-100 to-transparent rounded-full blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};

// Custom animations for floating effect
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(180deg); }
  }
  
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-180deg); }
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-float-delayed {
    animation: float-delayed 4s ease-in-out infinite;
    animation-delay: 1s;
  }
`;
document.head.appendChild(style);

export default LoadingScreen;