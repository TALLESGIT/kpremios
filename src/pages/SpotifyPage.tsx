import React, { useEffect, useState } from 'react';
import { Music, AlertCircle } from 'lucide-react';
import { SpotifyService, SpotifyRelease } from '../services/SpotifyService';

const SpotifyPage: React.FC = () => {
  const [releases, setReleases] = useState<SpotifyRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReleases();
  }, []);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const data = await SpotifyService.getAll();
      setReleases(data || []);
    } catch (err) {
      console.error('Erro ao carregar lançamentos:', err);
      setError('Não foi possível carregar os lançamentos. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-4 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
          <Music className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">
          Lançamentos ZK
        </h1>
        <p className="text-blue-200/60 max-w-md mx-auto">
          Ouça os últimos sucessos e playlists exclusivas do ZK diretamente no Spotify.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-200">{error}</p>
          <button 
            onClick={loadReleases}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      ) : releases.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10">
          <Music className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum lançamento encontrado</h3>
          <p className="text-white/50">Em breve novidades por aqui!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {releases.map((release) => (
            <div 
              key={release.id} 
              className="bg-[#121212] rounded-xl overflow-hidden shadow-xl border border-white/10 hover:border-green-500/50 transition-all duration-300 group"
            >
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-4 truncate flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {release.title}
                </h3>
                <div className="aspect-[3/4] md:aspect-video w-full rounded-lg overflow-hidden bg-black/50 relative">
                  <iframe 
                    style={{ borderRadius: '12px' }} 
                    src={release.embed_url} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    allowFullScreen 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    className="absolute inset-0 w-full h-full"
                  ></iframe>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpotifyPage;
