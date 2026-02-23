import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react';

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
  compact?: boolean; // Modo compacto para usar no espaço das estatísticas
}

export default function AdvertisementCarousel({
  position = 'homepage',
  autoPlay = true,
  autoPlayInterval = 5000,
  compact = false
}: AdvertisementCarouselProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('right'); // Direção da animação

  useEffect(() => {
    loadAdvertisements();
  }, [position]);

  useEffect(() => {
    if (advertisements.length > 1 && autoPlay) {
      const interval = setInterval(() => {
        setDirection('right');
        setCurrentIndex((prev) => (prev + 1) % advertisements.length);
      }, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [advertisements.length, autoPlay, autoPlayInterval]);

  const loadAdvertisements = async () => {
    try {
      const now = new Date().toISOString();
      
      // Verificar se o Supabase está configurado corretamente
      if (!supabase) {
        console.warn('Supabase client não está disponível');
        setAdvertisements([]);
        return;
      }
      
      // Buscar todos os anúncios ativos da posição com tratamento de erro robusto
      let queryResult;
      try {
        queryResult = await supabase
          .from('advertisements')
          .select('*')
          .eq('position', position)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });
      } catch (queryError: any) {
        // Se houver erro na query, logar e retornar array vazio
        console.warn('Erro ao executar query de anúncios:', queryError?.message || queryError);
        setAdvertisements([]);
        return;
      }

      const { data, error } = queryResult;

      if (error) {
        // Log do erro mas não quebrar a aplicação
        console.warn('Erro na resposta de anúncios:', error.message || error);
        setAdvertisements([]);
        return;
      }
      
      // Filtrar por datas no cliente (mais seguro)
      const filteredAds = (data || []).filter((ad) => {
        try {
          // start_date deve ser NULL ou <= agora
          const startDateValid = !ad.start_date || new Date(ad.start_date) <= new Date(now);
          // end_date deve ser NULL ou >= agora
          const endDateValid = !ad.end_date || new Date(ad.end_date) >= new Date(now);
          
          return startDateValid && endDateValid;
        } catch (filterError) {
          // Se houver erro ao filtrar uma data, incluir o anúncio por segurança
          console.warn('Erro ao filtrar data do anúncio:', filterError);
          return true;
        }
      });
      
      setAdvertisements(filteredAds);
    } catch (error: any) {
      // Capturar qualquer erro não esperado
      console.warn('Erro geral ao carregar anúncios:', error?.message || error);
      // Não quebrar a aplicação se houver erro, apenas logar e definir array vazio
      setAdvertisements([]);
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
    setDirection('left');
    setCurrentIndex((prev) => (prev - 1 + advertisements.length) % advertisements.length);
  };

  const goToNext = () => {
    setDirection('right');
    setCurrentIndex((prev) => (prev + 1) % advertisements.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 'right' : 'left');
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
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-blue-500/20 via-blue-400/40 to-blue-500/20 shadow-2xl overflow-hidden group">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-[23px] px-8 py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)] anima-pulse"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
              <ImageIcon className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
            <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Anuncie Aqui</span>
            <h3 className="text-white font-black text-2xl sm:text-3xl uppercase tracking-tighter mb-4 italic">Cresça com a Nação Azul</h3>
            <p className="text-blue-200/60 text-sm max-w-md mx-auto leading-relaxed">Destaque sua marca para milhares de torcedores apaixonados. Entre em contato para anunciar.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentAd = advertisements[currentIndex];

  // Se for modo compacto, renderizar versão simplificada (mesma altura das estatísticas)
  if (compact) {
    return (
      <div className="relative w-full h-full group overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            width: `${advertisements.length * 100}%`
          }}
        >
          {advertisements.map((ad, index) => (
            <div
              key={ad.id}
              className="flex-shrink-0 h-full w-full"
            >
              {ad.image_url && (
                <div className="relative w-full h-full rounded overflow-hidden border border-white/10 bg-slate-950/50">
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Navigation Controls - Compacto */}
        {advertisements.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-20"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-20"
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {advertisements.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className={`h-1.5 rounded-full transition-all ${index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/40 hover:bg-white/60 w-1.5'
                    }`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[2.5rem] p-[1px] bg-gradient-to-r from-blue-600/30 via-blue-400/50 to-blue-600/30 shadow-2xl overflow-hidden group">
      <div className="bg-slate-900 rounded-[2.4rem] relative overflow-hidden group/container h-full">
        {/* Decorative Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>

        {/* Banner Content */}
        <div
          className="relative flex flex-col items-center gap-2 p-2"
        >
          {currentAd.image_url && (
            <div className="relative w-full max-w-4xl aspect-[3/1] rounded-lg overflow-hidden border border-white/10 shadow-xl group-hover:scale-[1.01] transition-transform duration-700 bg-slate-950/50">
              <img
                src={currentAd.image_url}
                alt={currentAd.title}
                className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
            </div>
          )}

          <div className="flex-1 flex flex-col items-center text-center relative z-10 w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.25em]">Destaque</span>
              {currentAd.link_url && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Link Ativo
                </div>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white uppercase italic leading-tight mb-1 tracking-tight">
              {currentAd.title}
            </h3>

            {currentAd.description && (
              <p className="text-blue-100/70 text-[9px] sm:text-[10px] font-medium leading-tight mb-2 max-w-2xl">
                {currentAd.description}
              </p>
            )}

            {currentAd.link_url && (
              <button
                onClick={() => handleClick(currentAd)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-blue-900 rounded-md font-black uppercase tracking-[0.05em] text-[8px] hover:bg-blue-50 transition-all shadow-lg active:scale-95 group/btn animate-pulse-cta"
              >
                <span>Saiba Mais</span>
                <ExternalLink className="w-2.5 h-2.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>

          {/* Navigation Controls */}
          {advertisements.length > 1 && (
            <div>
              {/* Previous Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center rounded-2xl transition-all opacity-0 group-hover/container:opacity-100 hover:scale-110 active:scale-95 z-20"
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
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center rounded-2xl transition-all opacity-0 group-hover/container:opacity-100 hover:scale-110 active:scale-95 z-20"
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
                    className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                      }`}
                    aria-label={`Ir para slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
