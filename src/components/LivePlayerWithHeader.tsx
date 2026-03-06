import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LiveHlsPlayer from './LiveHlsPlayer';

interface LivePlayerWithHeaderProps {
  title: string;
  hlsUrl: string | null;
  isLive: boolean;
  streamId?: string;
  channelName?: string;
  className?: string;
  showPerf?: boolean;
}

/**
 * Componente que exibe o player HLS com título e botão de copiar link
 * Usado tanto para admin (preview) quanto para usuários
 */
export default function LivePlayerWithHeader({
  title,
  hlsUrl,
  isLive,
  streamId,
  channelName,
  className = '',
  showPerf = false,
}: LivePlayerWithHeaderProps) {
  const [copied, setCopied] = useState(false);

  const getLiveUrl = () => {
    if (channelName) {
      return `${window.location.origin}/live/${channelName}`;
    }
    if (streamId) {
      return `${window.location.origin}/live/${streamId}`;
    }
    return `${window.location.origin}/zk-tv`;
  };

  const handleCopyLink = async () => {
    const url = getLiveUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <div className={`flex flex-col h-full bg-black ${className}`}>
      {/* Header com título e botão copiar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 z-40">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-black text-white uppercase italic truncate">
            {title || 'ZK TV'}
          </h2>
          {/* Badge AO VIVO - REMOVIDO: Não exibir para usuários */}
        </div>
        <button
          onClick={handleCopyLink}
          className="ml-4 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
          title="Copiar link da live"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copiar link</span>
            </>
          )}
        </button>
      </div>

      {/* Player HLS */}
      <div className="flex-1 min-h-0">
        <LiveHlsPlayer hlsUrl={hlsUrl} isLive={isLive} showPerf={showPerf} />
      </div>
    </div>
  );
}

