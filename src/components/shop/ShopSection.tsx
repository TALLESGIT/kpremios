import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronRight, Zap, Trophy, Flame, Loader2, X, Star, ShoppingCart, Plus, Package } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

// CATEGORIAS DISPONÍVEIS NA LOJA
const CATEGORIES = [
  { id: 'all', label: 'Tudo', icon: Trophy },
  { id: 'jersey', label: 'Mantos', icon: Flame },
  { id: 'exclusive', label: 'Exclusivos', icon: Zap },
  { id: 'casual', label: 'Streetwear', icon: ShoppingBag },
  { id: 'accessories', label: 'Acessórios', icon: Package },
];



export function ShopSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeAudience, setActiveAudience] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setSelectedSize(product.available_sizes?.[0] || null);
  };

  const handleBuyFromModal = () => {
    if (selectedProduct) {
      if (selectedProduct.available_sizes?.length && !selectedSize) {
        toast.error('Por favor, selecione um tamanho');
        return;
      }
      addToCart(selectedProduct, selectedSize || undefined);
      setIsCartOpen(true);
      setSelectedProduct(null);
      setSelectedSize(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const categoryMatch = activeCategory === 'all' || p.category === activeCategory;
    const audienceMatch = activeAudience === 'all' || p.target_audience === activeAudience;
    return categoryMatch && audienceMatch;
  });

  const galleryImages = selectedProduct 
    ? [selectedProduct.image_url, ...(selectedProduct.gallery_urls || [])]
    : [];

  return (
    <section id="shop" className="py-24 relative overflow-hidden bg-[#030712]">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
            >
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Loja Oficial ZK</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter"
            >
              VISTA A <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">ARMADURA</span>
            </motion.h2>
          </div>

          {/* Filtros de Categorias */}
          <div className="flex-1 w-full md:w-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-none no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 outline-none ${
                    activeCategory === cat.id
                      ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-600/30'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <cat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeCategory === cat.id ? 'text-white' : 'text-blue-500'}`} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-Filtros de Público (Kids, Masc, Fem) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-none no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-4">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'masculino', label: 'Masculino' },
                { id: 'feminino', label: 'Feminino' },
                { id: 'kids', label: 'Kids' },
              ].map((aud) => (
                <button
                  key={aud.id}
                  onClick={() => setActiveAudience(aud.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeAudience === aud.id
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {aud.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grade de Produtos */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando armadura...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onViewDetails={handleViewDetails}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/30 rounded-[2.5rem] border border-white/5">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}

        {/* Banner de Membro VIP */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mt-20 p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-900 overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-white/10 to-transparent skew-x-12 translate-x-1/2 group-hover:translate-x-1/3 transition-transform duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
                SEJA UM MEMBRO <span className="text-amber-400">ZK GOLD</span>
              </h3>
              <p className="text-blue-100 text-sm md:text-base font-medium max-w-xl">
                Ganhe frete grátis em todos os produtos da loja, descontos exclusivos de 20% e acesso antecipado aos novos mantos.
              </p>
            </div>
            <button className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
              SAIBER MAIS
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Global Product Quick View Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-[#0f172a] rounded-[2.5rem] sm:rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Botão Fechar */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-50 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Lado Esquerdo: Galeria */}
                  <div className="p-6 sm:p-12 lg:border-r border-white/5">
                    <div className="aspect-square rounded-[2rem] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 border border-white/5 relative group/img mb-6">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={currentImageIndex}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          src={galleryImages[currentImageIndex]}
                          className="w-full h-full object-contain p-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        />
                      </AnimatePresence>
                    </div>

                    {/* Miniaturas */}
                    {galleryImages.length > 1 && (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar snap-x">
                        {galleryImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all snap-center ${
                              currentImageIndex === idx ? 'border-blue-500 bg-blue-500/20 scale-105' : 'border-white/5 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <img src={img} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lado Direito: Informações */}
                  <div className="p-6 sm:p-12 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest italic">
                          {selectedProduct.brand}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                      </div>

                      <h4 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-6">
                        {selectedProduct.name}
                      </h4>

                      <div className="space-y-6">
                        {/* Preço removido conforme solicitado */}
                        {/* <div className="flex flex-col">
                          <span className="text-slate-500 text-sm line-through font-bold opacity-30">R$ {(selectedProduct.price * 1.2).toFixed(2).replace('.', ',')}</span>
                          <span className="text-4xl sm:text-5xl font-black text-emerald-400 italic tracking-tighter">R$ {selectedProduct.price.toFixed(2).replace('.', ',')}</span>
                        </div> */}

                        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10">
                          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                            {selectedProduct.description || 'Este manto sagrado faz parte da coleção oficial. Fabricado com tecnologia de ponta para máximo conforto e durabilidade tanto no dia a dia quanto na torcida.'}
                          </p>
                        </div>

                        {/* Seleção de Tamanhos no Modal */}
                        {selectedProduct.available_sizes && selectedProduct.available_sizes.length > 0 && (
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                              Selecione o Tamanho
                              {selectedProduct.target_audience && (
                                <span className="text-slate-600 font-bold">• {selectedProduct.target_audience}</span>
                              )}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedProduct.available_sizes.map((size) => (
                                <button
                                  key={size}
                                  onClick={() => setSelectedSize(size)}
                                  className={`min-w-[3rem] h-12 flex items-center justify-center rounded-xl text-xs font-black transition-all border ${
                                    selectedSize === size
                                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20'
                                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!selectedProduct.gallery_urls || selectedProduct.gallery_urls.length === 0) && (
                          <div className="flex items-center gap-2 text-blue-400/50">
                            <Plus className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Mais fotos detalhadas em breve</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-12 flex flex-col gap-4">
                      <button
                        onClick={handleBuyFromModal}
                        disabled={selectedProduct.is_coming_soon}
                        className={`w-full ${selectedProduct.is_coming_soon ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 shadow-xl'} h-16 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all group`}
                      >
                        {!selectedProduct.is_coming_soon && <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        {selectedProduct.is_coming_soon ? 'LANÇAMENTO EM BREVE' : 'GARANTIR AGORA'}
                      </button>
                      <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {selectedProduct.is_coming_soon ? 'Fique atento às nossas redes para o lançamento' : '🚚 Frete grátis para membros ZK Gold'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
