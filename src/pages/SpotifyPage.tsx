import React, { useEffect, useState, useCallback } from 'react';
import { Music, AlertCircle, Play, Clock, Share2, ListMusic, ExternalLink } from 'lucide-react';
import { SpotifyService, SpotifyRelease } from '../services/SpotifyService';
import { motion, AnimatePresence } from 'framer-motion';

const SpotifyPage: React.FC = () => {
  const [releases, setReleases] = useState<SpotifyRelease[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<SpotifyRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [artCache, setArtCache] = useState<Record<string, string>>({});

  useEffect(() => {
    loadReleases();
  }, []);

  // Fetch album art when selected release changes
  const fetchAlbumArt = useCallback(async (release: SpotifyRelease) => {
    // Check cache first
    if (artCache[release.id]) {
      setAlbumArt(artCache[release.id]);
      return;
    }
    try {
      const art = await SpotifyService.getAlbumArt(release.embed_url);
      if (art) {
        setAlbumArt(art);
        setArtCache(prev => ({ ...prev, [release.id]: art }));
      }
    } catch {
      // Keep current art or null
    }
  }, [artCache]);

  useEffect(() => {
    if (selectedRelease) {
      fetchAlbumArt(selectedRelease);
    }
  }, [selectedRelease, fetchAlbumArt]);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const data = await SpotifyService.getAll();
      setReleases(data || []);
      if (data && data.length > 0) {
        setSelectedRelease(data[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar lançamentos:', err);
      setError('Não foi possível carregar os lançamentos. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  /** Build a regular Spotify link from an embed URL for "Open in Spotify" */
  const getSpotifyLink = (embedUrl: string) => {
    return embedUrl.replace('/embed/', '/');
  };

  const featuredRelease = selectedRelease || releases[0];

  return (
    <div className="min-h-screen bg-[#090909] pb-24 md:pb-8 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ───────────── Hero Section with Album Art Background ───────────── */}
        <AnimatePresence mode="wait">
          {featuredRelease && (
            <motion.div
              key={featuredRelease.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative overflow-hidden rounded-3xl mb-12 border border-white/5 shadow-2xl"
            >
              {/* Background: blurred album art */}
              <div className="absolute inset-0 z-0">
                {albumArt ? (
                  <>
                    <img
                      src={albumArt}
                      alt=""
                      className="w-full h-full object-cover scale-125 blur-[60px] opacity-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90"></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-green-900/40 to-black/60"></div>
                )}
              </div>

              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
                {/* Album Art Cover */}
                <div className="relative group shrink-0">
                  <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 relative">
                    {albumArt ? (
                      <img
                        src={albumArt}
                        alt={featuredRelease.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 via-emerald-600 to-blue-600 flex items-center justify-center">
                        <Music className="w-24 h-24 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/40 border-4 border-[#090909] hover:scale-110 transition-transform cursor-pointer"
                    onClick={() => window.open(getSpotifyLink(featuredRelease.embed_url), '_blank')}
                  >
                    <Play className="w-7 h-7 text-black fill-current ml-0.5" />
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-green-500 text-black text-[10px] font-black uppercase tracking-widest">Destaque</span>
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Capitão ZK</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 italic tracking-tighter uppercase leading-tight drop-shadow-xl">
                    {featuredRelease.title}
                  </h1>

                  {/* Spotify open link */}
                  <a
                    href={getSpotifyLink(featuredRelease.embed_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mb-6 text-green-400 hover:text-green-300 text-sm font-bold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvir completa no Spotify
                  </a>

                  {/* Larger Spotify Embed (352px = shows more tracks / full controls) */}
                  <div className="h-full min-h-[352px] w-full max-w-xl bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                    <iframe
                      src={featuredRelease.embed_url}
                      width="100%"
                      height="352"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="bg-transparent"
                    ></iframe>
                  </div>

                  {/* Info about preview limitation */}
                  <p className="mt-3 text-white/30 text-[10px] font-medium">
                    💡 Faça login no Spotify para ouvir a música completa. Sem login, apenas uma prévia de 30s é disponibilizada.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ───────────── Track List Section ───────────── */}
        <div className="bg-[#121212]/50 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/30">
                <ListMusic className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Todas as Faixas</h2>
            </div>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest">{releases.length} Itens</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/10">
              <Music className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium">Nenhum lançamento catalogado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-8 md:col-span-6 lg:col-span-7">Título</div>
                <div className="hidden md:block md:col-span-3 lg:col-span-3">Data</div>
                <div className="col-span-3 md:col-span-2 lg:col-span-1 text-right">
                  <Clock className="w-4 h-4 ml-auto" />
                </div>
              </div>

              {releases.map((release, index) => (
                <motion.button
                  key={release.id}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedRelease(release);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`grid grid-cols-12 gap-4 w-full text-left px-6 py-4 rounded-2xl transition-all duration-300 group ${featuredRelease?.id === release.id ? 'bg-green-500/10 border border-green-500/30' : 'border border-transparent'}`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    {featuredRelease?.id === release.id ? (
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    ) : (
                      <span className="text-white/20 font-black group-hover:hidden">{index + 1}</span>
                    )}
                    <Play className="w-3 h-3 text-white hidden group-hover:block fill-current" />
                  </div>

                  <div className="col-span-8 md:col-span-6 lg:col-span-7 flex flex-col justify-center">
                    <p className={`font-bold transition-colors truncate ${featuredRelease?.id === release.id ? 'text-green-400' : 'text-white'}`}>
                      {release.title}
                    </p>
                    <p className="text-white/30 text-[10px] font-semibold uppercase">ZK Official Release</p>
                  </div>

                  <div className="hidden md:flex col-span-3 lg:col-span-3 items-center">
                    <span className="text-white/30 text-xs font-medium">
                      {new Date(release.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="col-span-3 md:col-span-2 lg:col-span-1 flex items-center justify-center">
                    <div
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.share) {
                          navigator.share({
                            title: release.title,
                            url: release.embed_url.replace('/embed/', '/'),
                          });
                        }
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all ml-auto cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed bottom-28 left-4 right-4 md:left-auto md:right-8 md:w-80 z-50 animate-in slide-in-from-right-8 fade-in">
          <div className="bg-red-500/10 backdrop-blur-xl border-2 border-red-500/20 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-200 text-sm font-medium leading-tight">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyPage;
