interface ZKLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function ZKLogo({ className = '', size = 'md' }: ZKLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle with gradient */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#zkGradient)"
          stroke="url(#zkStroke)"
          strokeWidth="2"
        />
        
        {/* ZK Letters */}
        <g className="font-bold">
          {/* Z Letter - Corrigido */}
          <path
            d="M18 25 L42 25 L42 32 L28 43 L42 43 L42 50 L18 50 L18 43 L32 32 L18 32 Z"
            fill="#FCD34D"
            stroke="#F59E0B"
            strokeWidth="0.5"
          />
          
          {/* K Letter */}
          <path
            d="M54 25 L61 25 L61 35 L66 35 L73 25 L81 25 L72 37.5 L82 50 L74 50 L66 40 L61 40 L61 50 L54 50 Z"
            fill="#FCD34D"
            stroke="#F59E0B"
            strokeWidth="0.5"
          />
        </g>
        
        {/* Sparkle effects */}
        <circle cx="25" cy="20" r="1.5" fill="#FCD34D" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="75" cy="25" r="1" fill="#FCD34D" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="80" cy="70" r="1.5" fill="#FCD34D" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="20" cy="75" r="1" fill="#FCD34D" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite"/>
        </circle>
        
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="zkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="zkStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export { ZKLogo };