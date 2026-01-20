import React from 'react';
import PollDisplay from './PollDisplay';
import LiveChat from './LiveChat';

interface SideOverlayProps {
  streamId: string;
  isActive?: boolean;
  pinnedLinkSlot?: React.ReactNode; // Componente de link fixado
}

const SideOverlay: React.FC<SideOverlayProps> = ({ streamId, isActive = true, pinnedLinkSlot }) => {
  return (
    <div className="fixed right-2 top-2 bottom-2 z-40 flex flex-col gap-2 w-[280px] bg-black/70 rounded-xl p-2 overflow-hidden border border-white/10">
      <div className="flex-[3] min-h-0">
        <LiveChat
          key="chat-side-overlay"
          streamId={streamId}
          isActive={isActive}
          className="h-full"
          showHeader={false}
        />
      </div>
      <div className="flex-[1] min-h-0 space-y-2 overflow-y-auto custom-scrollbar">
        <PollDisplay streamId={streamId} compact={true} />
        {pinnedLinkSlot}
      </div>
    </div>
  );
};

export default SideOverlay;

