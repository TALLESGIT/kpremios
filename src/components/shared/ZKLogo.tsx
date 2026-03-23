interface ZKLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function ZKLogo({ className = '', size = 'md' }: ZKLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative group select-none`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-xl filter"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="zkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="zkAccentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Ring - Slate neutro */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#zkGradient)"
          stroke="#f59e0b"
          strokeWidth="2.5"
          className="shadow-inner"
        />

        {/* Decorative accent ring */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />

        {/* ZK Typography - Modern Sporty Style */}
        <g strokeWidth="0" transform="translate(0, 5) scale(0.9) translate(5, 0)">
          {/* Z */}
          <path
            d="M32 35 L48 35 L48 40 L38 55 L48 55 L48 62 L30 62 L30 56 L41 41 L32 41 Z"
            fill="url(#zkAccentGradient)"
            filter="url(#glow)"
            stroke="#f59e0b"
            strokeWidth="0.3"
          />

          {/* K */}
          <path
            d="M52 35 L60 35 L60 46 L68 35 L78 35 L68 49 L80 62 L70 62 L60 51 L60 62 L52 62 Z"
            fill="#FFFFFF"
            filter="url(#glow)"
            stroke="#FFFFFF"
            strokeWidth="0.2"
          />
        </g>

        {/* Small accent dot - top */}
        <circle cx="50" cy="22" r="2" fill="#f59e0b" fillOpacity="0.6" />
        
        {/* Small accent dot - bottom */}
        <circle cx="50" cy="78" r="2" fill="#f59e0b" fillOpacity="0.6" />

        {/* Glass Reflection */}
        <path
          d="M50 2 A 48 48 0 0 1 85 20 Q 50 40 15 20 A 48 48 0 0 1 50 2"
          fill="white"
          fillOpacity="0.15"
        />

      </svg>

      {/* Sparkle Animation Container */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-amber-400 rounded-full animate-ping opacity-75 duration-[3000ms]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75 delay-700 duration-[2000ms]"></div>
      </div>
    </div>
  );
}

export { ZKLogo };