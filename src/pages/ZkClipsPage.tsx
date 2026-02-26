import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Clock,
  Calendar,
  Share2,
  X,
  Search,
  ArrowLeft,
  Tv
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { YouTubeClip } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ZkClipsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clips, setClips] = useState<YouTubeClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<YouTubeClip | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('youtube_clips')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClips(data || []);
    } catch (error) {
      console.error('Erro ao carregar clipes:', error);
      toast.error('Não foi possível carregar os clipes');
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeId = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    } catch (e) {
      return null;
    }
  };

  const filteredClips = clips.filter(clip =>
    clip.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/5 rounded-full transition-colors group"
            >
              <ArrowLeft className="w-6 h-6 text-white/50 group-hover:text-white" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic uppercase tracking-tighter sm:text-3xl leading-none">
                ZK <span className="text-blue-500">CLIPS</span>
              </h1>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-0.5">Premium Content</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
              <Search className="w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Buscar clipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm ml-2 w-48 placeholder:text-white/20"
              />
            </div>
            <button
              onClick={() => navigate('/zk-tv')}
              className="bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all border border-white/10 group"
            >
              <Tv className="w-5 h-5 text-white/70 group-hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Featured Clip Section */}
        {!loading && clips.length > 0 && !searchTerm && (
          <section className="mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-video md:aspect-[21/9] rounded-3xl overflow-hidden group shadow-2xl"
            >
              <img
                src={clips[0].thumbnail_url || `https://img.youtube.com/vi/${getYouTubeId(clips[0].youtube_url)}/maxresdefault.jpg`}
                alt={clips[0].title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />

              <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 mb-4"
                >
                  <span className="bg-blue-600 text-[10px] font-black uppercase px-2 py-0.5 rounded italic">Inédito</span>
                  <span className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-widest">
                    <Clock className="w-3 h-3" /> {clips[0].duration || '00:00'}
                  </span>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.9] mb-6"
                >
                  {clips[0].title}
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-4"
                >
                  <button
                    onClick={() => setSelectedClip(clips[0])}
                    className="bg-white text-black hover:bg-white/90 px-8 py-4 rounded-full font-black uppercase text-sm flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" /> Assistir Agora
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 backdrop-blur-xl p-4 rounded-full border border-white/10 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Filters (Visual Placeholder) */}
        <div className="flex items-center gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
          {['Todos', 'Mais Recentes', 'Favoritos'].map((filter, i) => (
            <button
              key={i}
              className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${i === 0 ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-video bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClips.map((clip, index) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group cursor-pointer"
                onClick={() => setSelectedClip(clip)}
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 border border-white/5 shadow-xl">
                  <img
                    src={clip.thumbnail_url || `https://img.youtube.com/vi/${getYouTubeId(clip.youtube_url)}/maxresdefault.jpg`}
                    alt={clip.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black uppercase">
                    {clip.duration || '0:00'}
                  </div>
                </div>
                <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter leading-tight">
                  {clip.title}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {new Date(clip.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Video Player Overlay */}
      <AnimatePresence>
        {selectedClip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-12"
          >
            <button
              onClick={() => setSelectedClip(null)}
              className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors z-[110]"
            >
              <X className="w-8 h-8 text-white" />
            </button>

            <div className="w-full max-w-6xl flex flex-col gap-6">
              <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.15)] border border-white/10">
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(selectedClip.youtube_url)}?autoplay=1`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">
                  {selectedClip.title}
                </h2>
                <div className="flex items-center gap-6 text-white/40 text-sm font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> {selectedClip.duration || '00:00'}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" /> {new Date(selectedClip.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ZkClipsPage;
