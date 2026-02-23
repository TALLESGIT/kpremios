import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Instagram, Youtube, Music, Facebook,
  MessageCircle, ExternalLink, Globe, Heart
} from 'lucide-react';

interface SocialLinks {
  instagram?: string;
  youtube?: string;
  spotify?: string;
  facebook?: string;
  whatsapp?: string;
  soundcloud?: string;
}

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  socialLinks: SocialLinks;
}

const SocialModal: React.FC<SocialModalProps> = ({ isOpen, onClose, socialLinks }) => {
  const platforms = [
    { id: 'instagram', icon: Instagram, label: 'Instagram', subtitle: 'Siga no Insta', color: 'from-pink-500 to-purple-500', url: socialLinks.instagram },
    { id: 'youtube', icon: Youtube, label: 'YouTube', subtitle: 'Canal Oficial', color: 'from-red-500 to-red-700', url: socialLinks.youtube },
    { id: 'spotify', icon: Music, label: 'Spotify', subtitle: 'Ouvir no Spotify', color: 'from-green-500 to-green-700', url: socialLinks.spotify },
    { id: 'facebook', icon: Facebook, label: 'Facebook', subtitle: 'Página Oficial', color: 'from-blue-500 to-blue-700', url: socialLinks.facebook },
    { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', subtitle: 'Canal de Novidades', color: 'from-emerald-500 to-emerald-700', url: socialLinks.whatsapp },
  ].filter(p => p.url);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#0a1529]/95 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-[2.5rem] p-6 shadow-2xl overflow-hidden"
          >
            {/* Glossy Overlay */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter">REDES SOCIAIS</h2>
                  <p className="text-sm text-blue-200/60 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                    Nossa Comunidade <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-white/5"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              <div className="space-y-4">
                {platforms.length > 0 ? platforms.map((platform, idx) => {
                  const Icon = platform.icon;
                  return (
                    <motion.button
                      key={platform.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => window.open(platform.url, '_blank')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-[0.98] border border-white/5 group"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${platform.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-black text-white tracking-tight uppercase">{platform.label}</p>
                        <p className="text-xs text-blue-200/40 font-bold uppercase tracking-widest">{platform.subtitle}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4 text-white/30" />
                      </div>
                    </motion.button>
                  );
                }) : (
                  <div className="text-center py-10 opacity-40">
                    <Globe className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhuma rede cadastrada</p>
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">ZK OFICIAL &copy; 2024</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SocialModal;
