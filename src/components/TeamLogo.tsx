import React, { useState } from 'react';
import { getTeamLogo, getTeamColors, getTeamInitials } from '../utils/teamLogos';

interface TeamLogoProps {
  teamName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  customLogo?: string | null;
}

const TeamLogo: React.FC<TeamLogoProps> = ({
  teamName,
  size = 'md',
  className = '',
  showName = false,
  customLogo
}) => {
  const [imageError, setImageError] = useState(false);
  const logoUrl = customLogo || getTeamLogo(teamName);
  const colors = getTeamColors(teamName);
  const initials = getTeamInitials(teamName);

  const sizeClasses = {
    'xs': 'w-6 h-6 text-[8px]',
    'sm': 'w-8 h-8 text-xs',
    'md': 'w-12 h-12 text-base',
    'lg': 'w-16 h-16 text-xl',
    'xl': 'w-24 h-24 text-2xl',
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden border border-white/10 shadow-lg relative bg-white/5 backdrop-blur-sm`}
        style={{
          background: !logoUrl || imageError ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : undefined
        }}
      >
        {logoUrl && !imageError ? (
          <img
            src={logoUrl}
            alt={teamName}
            className="w-[85%] h-[85%] object-contain drop-shadow-md"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="font-bold text-white drop-shadow-sm uppercase tracking-tighter">
            {initials}
          </span>
        )}
      </div>
      {showName && (
        <span className="text-xs font-medium text-slate-300 truncate max-w-[80px]">
          {teamName}
        </span>
      )}
    </div>
  );
};

export default TeamLogo;
