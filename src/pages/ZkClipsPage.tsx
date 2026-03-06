import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Calendar, ExternalLink, Youtube, Search, Filter } from 'lucide-react';
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
  const [category, setCategory] = useState<'all' | 'gol' | 'entrevista' | 'resenha'>('all');

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

  const categories = [
    { id: 'all', label: 'Todos', icon: Filter },
    { id: 'gol', label: 'Gols', icon: Play },
    { id: 'entrevista', label: 'Entrevistas', icon: Search },
    { id: 'resenha', label: 'Resenhas', icon: Youtube },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-[#0A0A0B] pb-24 md:pb-12 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ───────────── Header & Featured ───────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span>
                <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">ZK TV Oficial</span>
              </div>
              <h1 className="text-4xl md:text-6x font-black text-white italic tracking-tighter uppercase leading-none">
                ZK <span className="text-red-600">Clips</span>
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
                  className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* ───────────── Main Content Area ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* Featured Video / Player */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <AnimatePresence mode="wait">
                {selectedClip ? (
                  <motion.div
                    key={selectedClip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full"
                  >
                    <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-black border border-white/5 shadow-2xl group">
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
                          <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Destaque</span>
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
                          className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all shadow-xl shadow-red-900/20 active:scale-95 group"
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

            {/* Sidebar / List */}
            <div className="lg:col-span-4 flex flex-col">
              <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.3em] mb-6 px-2">Recentes</h3>

              <div className="flex flex-col gap-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredClips.length === 0 ? (
                  <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/5">
                    <Search className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40 text-xs font-medium italic">Nenhum clip encontrado</p>
                  </div>
                ) : (
                  filteredClips.map((clip) => (
                    <motion.button
                      key={clip.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedClip(clip);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex gap-4 p-3 rounded-2xl transition-all duration-300 border ${selectedClip?.id === clip.id ? 'bg-red-600/10 border-red-600/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                    >
                      <div className="relative w-32 h-20 shrink-0 rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={getYouTubeThumbnail(clip.youtube_url || '')}
                          alt={clip.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes('hqdefault.jpg')) {
                              target.src = target.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                            } else if (target.src.includes('mqdefault.jpg')) {
                              target.src = target.src.replace('mqdefault.jpg', 'default.jpg');
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                          <Play className={`w-6 h-6 ${selectedClip?.id === clip.id ? 'text-red-500' : 'text-white/60'} drop-shadow-lg`} />
                        </div>
                      </div>
                      <div className="flex flex-col justify-center min-w-0 pr-2">
                        <h4 className={`text-sm font-black uppercase italic leading-tight line-clamp-2 ${selectedClip?.id === clip.id ? 'text-red-500' : 'text-white'}`}>
                          {clip.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                            {new Date(clip.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ZkClipsPage;
