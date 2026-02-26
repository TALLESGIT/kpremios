import React, { useState } from 'react';
import { getTeamLogo, getTeamColors, getTeamInitials } from '../utils/teamLogos';

interface TeamLogoProps {
  teamName: string;
  customLogo?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

const SIZES = {
  sm: { container: 'w-8 h-8', text: 'text-[8px]', name: 'text-[10px]' },
  md: { container: 'w-12 h-12', text: 'text-[10px]', name: 'text-xs' },
  lg: { container: 'w-16 h-16', text: 'text-xs', name: 'text-sm' },
  xl: { container: 'w-20 h-20', text: 'text-sm', name: 'text-base' },
};

/**
 * Componente reutilizável de logo do time
 * Mostra o escudo do clube com fallback para iniciais coloridas
 */
const TeamLogo: React.FC<TeamLogoProps> = ({
  teamName,
  customLogo,
  size = 'md',
  className = '',
  showName = true
}) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = customLogo || getTeamLogo(teamName);
  const colors = getTeamColors(teamName);
  const initials = getTeamInitials(teamName);
  const sizeConfig = SIZES[size];

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className={`${sizeConfig.container} rounded-full flex items-center justify-center overflow-hidden relative group`}
        style={{
          background: !logoUrl || imgError
            ? `linear-gradient(135deg, ${colors.primary}, ${colors.primary}cc)`
            : 'transparent'
        }}
      >
        {logoUrl && !imgError ? (
          <>
            <img
              src={logoUrl}
              alt={teamName}
              className="w-full h-full object-contain p-0.5 drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <span
            className={`${sizeConfig.text} font-black tracking-tight`}
            style={{ color: colors.secondary }}
          >
            {initials}
          </span>
        )}
      </div>
      {showName && (
        <span className={`${sizeConfig.name} font-bold text-white truncate max-w-[80px] text-center leading-tight`}>
          {teamName}
        </span>
      )}
    </div>
  );
};

export default TeamLogo;
