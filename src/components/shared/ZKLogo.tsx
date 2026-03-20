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
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#3730a3" />
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

        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="#4f46e5"
          stroke="#FFFFFF"
          strokeWidth="2"
          className="shadow-inner"
        />

        {/* Decorative Stars */}
        {/* Estrela Maior (Alpha) - Bottom */}
        <path d="M50 75 L52 80 L57 80 L53 84 L55 89 L50 86 L45 89 L47 84 L43 80 L48 80 Z" fill="#FFFFFF" />

        {/* Estrela (Beta) - Left */}
        <path d="M25 50 L27 55 L32 55 L28 59 L30 64 L25 61 L20 64 L22 59 L18 55 L23 55 Z" fill="#FFFFFF" />

        {/* Estrela (Gamma) - Top */}
        <path d="M50 20 L52 25 L57 25 L53 29 L55 34 L50 31 L45 34 L47 29 L43 25 L48 25 Z" fill="#FFFFFF" />

        {/* Estrela (Delta) - Right */}
        <path d="M75 50 L77 55 L82 55 L78 59 L80 64 L75 61 L70 64 L72 59 L68 55 L73 55 Z" fill="#FFFFFF" />

        {/* Estrela (Epsilon) - Center Small */}
        <path d="M58 58 L59 60.5 L61.5 60.5 L59.5 62.5 L60.5 65 L58 63.5 L55.5 65 L56.5 62.5 L54.5 60.5 L57 60.5 Z" fill="#FFFFFF" />


        {/* ZK Typography - Modern Sporty Style */}
        <g strokeWidth="0" transform="translate(0, 5) scale(0.9) translate(5, 0)">
          {/* Z */}
          <path
            d="M32 35 L48 35 L48 40 L38 55 L48 55 L48 62 L30 62 L30 56 L41 41 L32 41 Z"
            fill="#FFFFFF"
            filter="url(#glow)"
            stroke="#FFFFFF"
            strokeWidth="0.2"
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

        {/* Glass Reflection */}
        <path
          d="M50 2 A 48 48 0 0 1 85 20 Q 50 40 15 20 A 48 48 0 0 1 50 2"
          fill="white"
          fillOpacity="0.2"
        />

      </svg>

      {/* Sparkle Animation Container */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75 duration-[3000ms]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75 delay-700 duration-[2000ms]"></div>
      </div>
    </div>
  );
}

export { ZKLogo };