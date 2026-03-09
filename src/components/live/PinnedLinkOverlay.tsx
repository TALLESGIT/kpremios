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
    <div className="w-full relative group">
      {/* Aurora Background Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/50 to-purple-600/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

      <div className="relative w-full bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl px-4 py-3 flex items-center gap-4 shadow-2xl overflow-hidden">
        {/* Animated Accent */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative">
            <div className="absolute -inset-1 bg-blue-500/20 rounded-full blur animate-pulse" />
            <div className="relative p-2 bg-blue-600/10 rounded-xl border border-blue-500/20">
              <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.15em] italic">
                Destaque
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                Link Fixado
              </span>
            </div>
            <p className="text-sm text-slate-100 font-bold truncate leading-tight">
              {pinned.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={pinned.pinned_link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-1.5"
          >
            Acessar
          </a>

          {canUnpin && (
            <button
              onClick={handleUnpin}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
              title="Remover fixado"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PinnedLinkOverlay;

