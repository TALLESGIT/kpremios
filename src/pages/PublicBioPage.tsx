import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  ExternalLink,
  Share2
} from 'lucide-react';
import { BioProfile } from '../types';

const PublicBioPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<BioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      loadProfile();
    }
  }, [slug]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bio_profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError(true);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading public bio:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const shareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: profile?.display_name || 'Link na Bio',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
          <UserIcon className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Perfil não encontrado</h1>
        <p className="text-gray-500 mb-8">O link que você acessou pode estar incorreto ou o perfil foi removido.</p>
        <Link to="/" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg">
          Ir para Início
        </Link>
      </div>
    );
  }

  const theme = profile.theme_config;

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: theme.backgroundColor || '#f8fafc' }}
    >
      {/* Top Bar / Share */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-end z-50">
        <button
          onClick={shareProfile}
          className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg text-gray-800 hover:scale-110 transition-transform"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-md mx-auto px-6 py-16 flex flex-col items-center">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center space-y-4 mb-10 w-full"
        >
          <div className="w-28 h-28 bg-white rounded-full p-1 shadow-2xl border-2 border-white/50 relative">
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="h-12 w-12 text-gray-300" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.textColor || '#1e293b' }}>
              {profile.display_name}
            </h1>
            {profile.bio && (
              <p className="text-base font-medium opacity-80 max-w-xs mx-auto" style={{ color: theme.textColor || '#1e293b' }}>
                {profile.bio}
              </p>
            )}
          </div>
        </motion.div>

        {/* Links Section */}
        <div className="w-full space-y-4">
          <AnimatePresence>
            {profile.custom_links?.map((link, index) => (
              <motion.a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 flex items-center justify-between group transition-all shadow-sm hover:shadow-xl border border-white/10"
                style={{
                  backgroundColor: theme.primaryColor || '#3b82f6',
                  color: '#ffffff',
                  borderRadius: theme.borderRadius || '16px'
                }}
              >
                <span className="font-bold text-lg">{link.label}</span>
                <ExternalLink className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </motion.a>
            ))}
          </AnimatePresence>
        </div>

        {/* Branding Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 flex flex-col items-center space-y-2"
        >
          <p className="text-xs font-bold opacity-40 uppercase tracking-widest" style={{ color: theme.textColor }}>
            Criado com
          </p>
          <Link to="/" className="flex items-center gap-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
            <span className="font-black text-xl italic tracking-tighter" style={{ color: theme.textColor }}>ZK PREMIOS</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicBioPage;
