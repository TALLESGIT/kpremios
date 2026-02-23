import React from 'react';
import PollDisplay from './PollDisplay';

interface BottomOverlayProps {
  streamId: string;
  children?: React.ReactNode; // Ex: componente de link fixado
}

const BottomOverlay: React.FC<BottomOverlayProps> = ({ streamId, children }) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),80px)] pointer-events-none">
      <div className="absolute left-1/2 -translate-x-1/2 bottom-20 w-[90%] max-w-[480px] bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 z-30 space-y-3">
        <PollDisplay streamId={streamId} compact={true} />
        {children}
      </div>
    </div>
  );
};

export default BottomOverlay;
