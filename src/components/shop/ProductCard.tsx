import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Star } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(({ product, onViewDetails }, ref) => {
  const { addToCart, setIsCartOpen } = useCart();

  const handleBuyNow = () => {
    // Se o produto tiver tamanhos, obriga o usuário a ver detalhes para escolher
    if (product.available_sizes && product.available_sizes.length > 0) {
      onViewDetails(product);
      return;
    }
    addToCart(product);
    setIsCartOpen(true);
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      className="bg-[#0f172a] rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 group shadow-2xl relative flex flex-col h-full"
    >
      {/* Imagem do Produto */}
      <div 
        onClick={() => onViewDetails(product)}
        className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center p-6 cursor-pointer"
      >
        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <motion.img
          src={product.image_url}
          alt={product.name}
          onClick={() => onViewDetails(product)}
          className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-700 ease-out cursor-pointer"
        />
        
        {/* Premium Badge only */}
        {product.category === 'exclusive' && (
          <div className="absolute top-4 right-4 z-10">
            <div className="px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
               <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                👑 PREMIUM
              </span>
            </div>
          </div>
        )}

        {/* Target Audience Badge */}
        {product.target_audience && product.target_audience !== 'unissex' && (
          <div className="absolute top-4 left-4 z-10">
            <div className="px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
               <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                {product.target_audience === 'masculino' && '♂ MASCULINO'}
                {product.target_audience === 'feminino' && '♀ FEMININO'}
                {product.target_audience === 'kids' && '👶 KIDS'}
              </span>
            </div>
          </div>
        )}

        {/* Coming Soon Badge */}
        {product.is_coming_soon && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-[1px] pointer-events-none">
            <div className="px-4 py-2 rounded-lg bg-amber-500 border border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] transform -rotate-12 scale-110">
               <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-tighter block text-center whitespace-nowrap">
                LANÇAMENTO EM BREVE
              </span>
            </div>
          </div>
        )}

        {/* Overlay de Ação Rápida */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(product);
            }}
            className="bg-white text-blue-900 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto"
            title="Ver Detalhes"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Detalhes - Refinado para evitar qualquer corte */}
      <div className="p-5 flex flex-col flex-1 justify-between bg-gradient-to-t from-slate-900 to-slate-900/50">
        <div className="space-y-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-[0.2em] italic mb-0.5">
              {product.brand}
            </span>
            <h3 className="text-white font-black text-sm sm:text-lg uppercase italic tracking-tight leading-[1.2] line-clamp-2 min-h-[2.4rem] sm:min-h-[3.2rem] group-hover:text-blue-400 transition-colors">
              {product.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 pb-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3 fill-amber-500 text-amber-500" />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 font-bold">(127)</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-white/5 gap-3">
{/* Preço removido conforme solicitado */}
          {/* <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 line-through font-bold opacity-30">
              R$ {(product.price * 1.2).toFixed(2).replace('.', ',')}
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-400 italic tracking-tighter">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </div> */}
          
          <button
            onClick={handleBuyNow}
            disabled={product.is_coming_soon}
            className={`${product.is_coming_soon ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'} h-10 sm:h-11 px-3 sm:px-5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all whitespace-nowrap border border-blue-400/30 w-full sm:w-auto`}
          >
            <ShoppingCart className={`w-3.5 h-3.5 ${product.is_coming_soon ? 'hidden' : ''}`} />
            <span>{product.is_coming_soon ? 'EM BREVE' : 'COMPRAR'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
});
