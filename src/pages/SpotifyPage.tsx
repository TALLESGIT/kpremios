import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Music, AlertCircle, Play, Clock, Share2, ListMusic, ExternalLink, Volume2, Disc, Headphones, Sparkles } from 'lucide-react';
import { SpotifyService, SpotifyRelease } from '../services/SpotifyService';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { useData } from '../context/DataContext';

const SpotifyPage: React.FC = () => {
  const [releases, setReleases] = useState<SpotifyRelease[]>([]);
  const { currentUser } = useData();
  const [selectedRelease, setSelectedRelease] = useState<SpotifyRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [artCache, setArtCache] = useState<Record<string, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const loadReleases = async () => {
    try {
      if (!currentUser?.club_slug) return;
      setLoading(true);
      const data = await SpotifyService.getAll(currentUser.club_slug);
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

  useEffect(() => {
    if (currentUser?.club_slug) {
      loadReleases();
    }
  }, [currentUser?.club_slug]);

  const fetchAlbumArt = useCallback(async (release: SpotifyRelease) => {
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
      setAlbumArt(null);
    }
  }, [artCache]);

  useEffect(() => {
    if (selectedRelease) {
      fetchAlbumArt(selectedRelease);
    }
  }, [selectedRelease, fetchAlbumArt]);

  const getSpotifyLink = (embedUrl: string) => {
    return embedUrl.replace('/embed/', '/');
  };

  const featuredRelease = selectedRelease || (releases.length > 0 ? releases[0] : null);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main ref={containerRef} className="flex-grow bg-[#050505] pb-24 md:pb-12 text-white selection:bg-green-500/30 overflow-x-hidden pt-24">

        {/* ───────────── BACKGROUND EFFECTS ───────────── */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={featuredRelease?.id || 'default'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              {albumArt ? (
                <img
                  src={albumArt}
                  alt=""
                  className="w-full h-full object-cover blur-[120px] scale-150"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-900/20 via-black to-emerald-900/20"></div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

          {/* ───────────── HEADER ───────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 mb-3"
              >
                <div className="w-8 h-[2px] bg-green-500"></div>
                <span className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em]">ZK Spotify Experience</span>
              </motion.div>
              <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                Músicas <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">ZK</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Plataforma</span>
                <span className="text-sm font-black text-white italic">SPOTIFY PREMIERE</span>
              </div>
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Headphones className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </header>

          {/* ───────────── HERO / PLAYER SECTION ───────────── */}
          <AnimatePresence mode="wait">
            {featuredRelease && (
              <motion.div
                key={featuredRelease.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-20"
              >
                <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Disc className="w-96 h-96 animate-spin-slow" />
                  </div>

                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* Album Cover Art */}
                    <div className="lg:col-span-4 flex justify-center">
                      <div className="relative group perspective-1000">
                        <motion.div
                          whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
                          className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-[0_50px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 relative z-20"
                        >
                          {albumArt ? (
                            <img
                              src={albumArt}
                              alt={featuredRelease.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-600 to-emerald-900 flex items-center justify-center">
                              <Music className="w-24 h-24 text-white/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </motion.div>

                        {/* Floating Decorative Elements */}
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="absolute -top-4 -left-4 w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20 z-30"
                        >
                          <Sparkles className="w-6 h-6 text-black" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Player Controls / Details */}
                    <div className="lg:col-span-8">
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <span className="px-4 py-1.5 rounded-full bg-green-500 text-black text-[10px] font-black uppercase tracking-[0.2em]">Live Now</span>
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                          <Volume2 className="w-3 h-3 text-green-400" />
                          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest italic">High Fidelity Audio</span>
                        </div>
                      </div>

                      <h2 className="text-4xl sm:text-7xl font-black text-white italic tracking-tighter uppercase leading-[0.9] mb-8 drop-shadow-2xl">
                        {featuredRelease.title}
                      </h2>

                      <div className="flex flex-col gap-6">
                        {/* The Actual Spotify Player */}
                        <div className="w-full max-w-2xl h-[152px] md:h-[180px] bg-black/40 rounded-3xl overflow-hidden border border-white/10 shadow-inner group">
                          <iframe
                            key={featuredRelease.id}
                            src={featuredRelease.embed_url}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="bg-transparent opacity-90 group-hover:opacity-100 transition-opacity"
                          ></iframe>
                        </div>

                        <div className="flex items-center gap-6">
                          <a
                            href={getSpotifyLink(featuredRelease.embed_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all hover:bg-green-500 hover:scale-105 active:scale-95 shadow-xl shadow-white/5 group"
                          >
                            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                            Abrir App Completo
                          </a>

                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: featuredRelease.title,
                                  url: getSpotifyLink(featuredRelease.embed_url)
                                });
                              }
                            }}
                            className="w-14 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                          >
                            <Share2 className="w-5 h-5 text-white/60" />
                          </button>
                        </div>

                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] italic">
                          Certifique-se de estar logado no Spotify para ouvir a versão completa
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ───────────── LIST SECTION ───────────── */}
          <div className="relative">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20">
                  <ListMusic className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Discografia</h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{releases.length} Lançamentos Encontrados</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse border border-white/5"></div>
                ))}
              </div>
            ) : releases.length === 0 ? (
              <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
                <Music className="w-16 h-16 text-white/5 mx-auto mb-6" />
                <p className="text-white/30 font-bold uppercase tracking-widest">Nenhum álbum catalogado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {releases.map((release, index) => (
                  <motion.button
                    key={release.id}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.04)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRelease(release);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`group flex items-center gap-5 p-5 rounded-[2rem] transition-all duration-300 border ${selectedRelease?.id === release.id ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                  >
                    <div className="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden shadow-2xl">
                      <TrackArtwork embedUrl={release.embed_url} title={release.title} />
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all ${selectedRelease?.id === release.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <Play className={`w-6 h-6 ${selectedRelease?.id === release.id ? 'text-green-500' : 'text-white'} fill-current drop-shadow-lg`} />
                      </div>
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Track {index + 1}</span>
                        <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                        <span className="text-[8px] font-bold text-green-500/60 uppercase tracking-widest">{new Date(release.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className={`text-lg font-black uppercase italic leading-none truncate mb-1 ${selectedRelease?.id === release.id ? 'text-green-400' : 'text-white'}`}>
                        {release.title}
                      </h4>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">ZK Exclusive Mix</p>
                    </div>

                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <ExternalLink className="w-4 h-4 text-green-400" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-red-900/40 border border-red-400/50 flex items-center gap-3">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Custom Styles for animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 20s linear infinite;
        }
        .perspective-1000 {
            perspective: 1000px;
        }
      `}} />
      </main>
      <Footer />
    </div>
  );
};

// Internal Helper for Track Thumbnails in List
const TrackArtwork: React.FC<{ embedUrl: string, title: string }> = ({ embedUrl, title }) => {
  const [artwork, setArtwork] = useState<string | null>(null);

  useEffect(() => {
    const getArt = async () => {
      const art = await SpotifyService.getAlbumArt(embedUrl);
      setArtwork(art);
    };
    getArt();
  }, [embedUrl]);

  if (!artwork) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
        <Music className="w-8 h-8 text-white/10" />
      </div>
    );
  }

  return <img src={artwork} alt={title} className="w-full h-full object-cover" />;
};

export default SpotifyPage;
