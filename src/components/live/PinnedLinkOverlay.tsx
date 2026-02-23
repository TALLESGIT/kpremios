import React, { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

interface PinnedLinkMessage {
  id: string;
  message: string;
  pinned_link: string | null;
}

interface PinnedLinkOverlayProps {
  streamId: string;
  canUnpin?: boolean;
}

const isPinnedDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

const PinnedLinkOverlay: React.FC<PinnedLinkOverlayProps> = ({ streamId, canUnpin = false }) => {
  const [pinned, setPinned] = useState<PinnedLinkMessage | null>(null);

  const { isConnected, emit, on, off } = useSocket({
    streamId,
    autoConnect: true
  });

  useEffect(() => {
    if (!isConnected || !streamId) return;

    if (isPinnedDebug()) console.log('🔗 PinnedLinkOverlay: Solicitando link fixado inicial via socket');
    emit('chat-get-pinned-link', { streamId });

    const handlePinnedLinkActive = (data: any) => {
      if (isPinnedDebug()) console.log('🔗 PinnedLinkOverlay: Link fixado ativo recebido:', data?.id);
      if (data && data.is_pinned && data.pinned_link) {
        setPinned({
          id: data.id,
          message: data.message,
          pinned_link: data.pinned_link,
        });
      } else {
        setPinned(null);
      }
    };

    const handlePinnedLinkUpdated = (data: any | null) => {
      if (isPinnedDebug()) console.log('🔗 PinnedLinkOverlay: Link fixado atualizado:', data?.id);
      if (data && data.is_pinned && data.pinned_link) {
        setPinned({
          id: data.id,
          message: data.message,
          pinned_link: data.pinned_link,
        });
      } else {
        setPinned(null);
      }
    };

    on('pinned-link-active', handlePinnedLinkActive);
    on('pinned-link-updated', handlePinnedLinkUpdated);

    return () => {
      off('pinned-link-active', handlePinnedLinkActive);
      off('pinned-link-updated', handlePinnedLinkUpdated);
    };
  }, [isConnected, streamId, on, off, emit]);

  const handleUnpin = async () => {
    if (!pinned || !canUnpin) return;
    try {
      if (isPinnedDebug()) console.log('🔗 PinnedLinkOverlay: Desfixando link via socket');
      emit('chat-unpin-link', { streamId, messageId: pinned.id });
    } catch (err) {
      if (isPinnedDebug()) console.error('PinnedLinkOverlay: erro ao desfixar link', err);
    }
  };

  if (!pinned || !pinned.pinned_link) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900/80 border border-blue-500/40 rounded-xl px-3 py-2 flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Link2 className="w-4 h-4 text-blue-300 shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">
            Link fixado
          </span>
          <p className="text-xs text-white font-semibold truncate">
            {pinned.message}
          </p>
        </div>
      </div>
      <a
        href={pinned.pinned_link}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg transition-colors"
      >
        Abrir
      </a>
      {canUnpin && (
        <button
          onClick={handleUnpin}
          className="ml-1 p-1 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <X className="w-3 h-3 text-red-400" />
        </button>
      )}
    </div>
  );
};

export default PinnedLinkOverlay;

