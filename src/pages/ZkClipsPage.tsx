import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Calendar, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { YouTubeClip } from '../types';
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from '../utils/youtube';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const ZkClipsPage: React.FC = () => {
  const [clips, setClips] = useState<YouTubeClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<YouTubeClip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category] = useState<'all' | 'gol' | 'entrevista' | 'resenha'>('all');

  useEffect(() => {
    fetchClips();
  }, []);

  const fetchClips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('youtube_clips')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClips(data || []);
      if (data && data.length > 0) {
        setSelectedClip(data[0]);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClips = clips.filter(clip => {
    const matchesSearch = clip.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'all' || clip.category === category;
    return matchesSearch && matchesCategory;
  });


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-[#030712] pb-24 md:pb-12 pt-[calc(6rem+env(safe-area-inset-top,0px))] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* ───────────── Header & Featured ───────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">ZK TV Oficial</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                ZK <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">Clips</span>
              </h1>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-red-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar clip..."
                  className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium backdrop-blur-xl"
                />
              </div>
            </div>
          </div>

          {/* ───────────── Main Content Area ───────────── */}
          <div className="flex flex-col gap-16">

            {/* Featured Video / Player */}
            <div className="w-full xl:w-[80%] mx-auto flex flex-col gap-6">
              <AnimatePresence mode="wait">
                {selectedClip ? (
                  <motion.div
                    key={selectedClip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full"
                  >
                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] group ring-1 ring-white/5">
                      <iframe
                        key={selectedClip.id}
                        src={getYouTubeEmbedUrl(selectedClip.youtube_url || '')}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{selectedClip.category}</span>
                          <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {new Date(selectedClip.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight italic">
                          {selectedClip.title}
                        </h2>
                        {selectedClip.description && (
                          <p className="mt-4 text-white/50 text-sm leading-relaxed max-w-2xl font-medium">
                            {selectedClip.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex sm:flex-col gap-3">
                        <a
                          href={`https://youtube.com/watch?v=${selectedClip.youtube_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all shadow-xl shadow-blue-900/40 active:scale-95 group border border-blue-500/50"
                        >
                          Assitir no Youtube
                          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="aspect-video bg-white/5 rounded-[2rem] border border-white/5 border-dashed flex items-center justify-center">
                    <Play className="w-16 h-16 text-white/10" />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Playlists by Category */}
            <div className="flex flex-col gap-12 w-full">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredClips.length === 0 ? (
                <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/5 max-w-xl mx-auto w-full">
                  <Search className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-xs font-medium italic">Nenhum clip encontrado</p>
                </div>
              ) : (
                Array.from(new Set(filteredClips.map(c => c.category))).map(cat => {
                  const catClips = filteredClips.filter(c => c.category === cat);
                  if (catClips.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-6 group/row">
                      <div className="flex items-center gap-3 px-4">
                        <div className="w-1 h-8 bg-blue-600 rounded-full" />
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-wider">{cat}</h3>
                      </div>

                      <div className="relative">
                        {/* Left Scroll Button */}
                        <button
                          onClick={() => {
                            const container = document.getElementById(`scroll-cat-public-${cat}`);
                            if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                          }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto hover:bg-blue-600 hover:border-blue-500 hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all hidden md:flex"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>

                        <div
                          id={`scroll-cat-public-${cat}`}
                          className="flex flex-nowrap w-full overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide px-4 sm:px-0 touch-pan-x"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {catClips.map((clip) => (
                            <button
                              key={clip.id}
                              draggable={false}
                              onClick={() => {
                                setSelectedClip(clip);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`flex-none w-[280px] sm:w-[320px] snap-center flex flex-col gap-3 p-3 rounded-2xl transition-all duration-300 border text-left cursor-pointer hover:-translate-y-1 active:scale-95 ${selectedClip?.id === clip.id ? 'bg-blue-600/10 border-blue-600/30 shadow-lg shadow-blue-900/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                              <div className="relative w-full aspect-video shrink-0 rounded-xl overflow-hidden shadow-lg bg-black">
                                <img
                                  draggable={false}
                                  src={getYouTubeThumbnail(clip.youtube_url)}
                                  alt={clip.title}
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.includes('hqdefault.jpg')) {
                                      target.src = target.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                                    } else if (target.src.includes('mqdefault.jpg')) {
                                      target.src = target.src.replace('mqdefault.jpg', 'default.jpg');
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 hover:bg-black/0 transition-colors flex items-center justify-center backdrop-blur-[1px] hover:backdrop-blur-0">
                                  <Play className={`w-10 h-10 ${selectedClip?.id === clip.id ? 'text-blue-500 origin-center scale-110' : 'text-white/80'} drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all`} />
                                </div>
                              </div>
                              <div className="flex flex-col justify-start w-full px-1">
                                <h4 className={`text-sm font-black uppercase italic leading-tight line-clamp-2 ${selectedClip?.id === clip.id ? 'text-blue-500' : 'text-white'}`}>
                                  {clip.title}
                                </h4>
                                <div className="mt-2 text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
                                  <span>{new Date(clip.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Right Scroll Button */}
                        <button
                          onClick={() => {
                            const container = document.getElementById(`scroll-cat-public-${cat}`);
                            if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto hover:bg-blue-600 hover:border-blue-500 hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all hidden md:flex"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ZkClipsPage;
