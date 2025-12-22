import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  position: string;
}

interface AdvertisementCarouselProps {
  position?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export default function AdvertisementCarousel({ 
  position = 'homepage',
  autoPlay = true,
  autoPlayInterval = 5000 
}: AdvertisementCarouselProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdvertisements();
  }, [position]);

  useEffect(() => {
    if (advertisements.length > 1 && autoPlay) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % advertisements.length);
      }, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [advertisements.length, autoPlay, autoPlayInterval]);

  const loadAdvertisements = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvertisements(data || []);
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (ad: Advertisement) => {
    if (ad.link_url) {
      // Incrementar contador de cliques
      try {
        await supabase.rpc('increment_advertisement_clicks', { ad_id: ad.id });
      } catch (error) {
        console.error('Erro ao registrar clique:', error);
      }
      
      // Abrir link em nova aba
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + advertisements.length) % advertisements.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % advertisements.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-white/20 via-blue-400/50 to-white/20">
        <div className="bg-gradient-to-r from-primary-dark to-blue-900 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="animate-pulse">
            <div className="h-48 bg-slate-700/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (advertisements.length === 0) {
    return (
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-white/20 via-blue-400/50 to-white/20">
        <div className="bg-gradient-to-r from-primary-dark to-blue-900 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Publicidade</span>
            <h3 className="text-white font-black text-2xl sm:text-4xl uppercase tracking-widest mb-4 opacity-80">Seu anúncio aqui</h3>
            <p className="text-blue-200 text-sm max-w-lg mx-auto">Destaque sua marca para a maior torcida de Minas Gerais. Entre em contato.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentAd = advertisements[currentIndex];

  return (
    <div className="rounded-2xl p-[1px] bg-gradient-to-r from-white/20 via-blue-400/50 to-white/20">
      <div className="bg-gradient-to-r from-primary-dark to-blue-900 rounded-2xl relative overflow-hidden group">
        {/* Banner Content */}
        <div
          onClick={() => handleClick(currentAd)}
          className={`relative p-8 sm:p-12 text-center ${currentAd.link_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        >
          {currentAd.image_url ? (
            <div className="mb-6">
              <img
                src={currentAd.image_url}
                alt={currentAd.title}
                className="max-w-full h-auto max-h-64 mx-auto rounded-xl shadow-2xl object-contain"
              />
            </div>
          ) : null}
          
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Publicidade</span>
            <h3 className="text-white font-black text-2xl sm:text-4xl uppercase tracking-widest mb-4">
              {currentAd.title}
            </h3>
            {currentAd.description && (
              <p className="text-blue-200 text-sm max-w-lg mx-auto mb-4">
                {currentAd.description}
              </p>
            )}
            {currentAd.link_url && (
              <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                <span>Clique para saber mais</span>
                <ExternalLink className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        {advertisements.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label="Próximo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {advertisements.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

