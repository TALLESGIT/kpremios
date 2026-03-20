import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Truck, MapPin, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { calculateShipping, getAddressFromZip, ShippingCalculation } from '../../utils/shipping';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cart, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  
  const [zipCode, setZipCode] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingCalculation | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [complement, setComplement] = useState('');

  // Recalcular frete se o carrinho mudar e já tiver um CEP
  useEffect(() => {
    if (shippingInfo && cart.length > 0) {
      handleCalculateShipping(zipCode);
    } else if (cart.length === 0) {
      setShippingInfo(null);
    }
  }, [cart]);

  // Bloquear scroll do body quando o carrinho estiver aberto
  useEffect(() => {
    if (isCartOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isCartOpen]);

  const handleCalculateShipping = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      if (cleanCep.length > 0) toast.error('CEP inválido');
      return;
    }

    setIsCalculating(true);
    try {
      const address = await getAddressFromZip(cleanCep);
      if (!address) {
        toast.error('CEP não encontrado');
        return;
      }

      const products = cart.map(item => item.product);
      const result = await calculateShipping(address.state, products);
      setShippingInfo({
        ...result,
        address
      });
    } catch (error) {
      toast.error('Erro ao calcular frete');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Por favor, faça login para finalizar o pedido');
      setIsCartOpen(false);
      window.location.href = '/login?redirect=/loja';
      return;
    }

    if (cart.length === 0) return;

    if (!shippingInfo) {
      toast.error('Por favor, calcule o frete primeiro');
      return;
    }

    if (!houseNumber.trim()) {
      toast.error('Por favor, informe o número da residência');
      return;
    }

    setIsFinishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-store-checkout', {
        body: {
          user_id: user.id,
          customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
          customer_email: user.email,
          items: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image_url: item.product.image_url,
            selectedSize: item.selectedSize
          })),
          shipping_cost: shippingInfo.cost,
          zip_code: zipCode,
          house_number: houseNumber,
          complement: complement,
          address_state: shippingInfo.stateCode,
          street: shippingInfo.address?.street,
          neighborhood: shippingInfo.address?.neighborhood,
          city: shippingInfo.address?.city
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Redireciona para o Checkout Pro do Mercado Pago
        window.location.href = data.checkout_url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error: any) {
      console.error('Erro no checkout:', error);
      
      let errorMessage = 'Erro ao processar pedido. Tente novamente.';
      
      // No Supabase v2, o corpo do erro 500/400 pode estar no context.json
      if (error.context) {
        try {
          // Tentar ler o corpo da resposta se for um erro de função
          const body = await error.context.json();
          if (body && (body.error || body.message)) {
            errorMessage = body.error || body.message;
          }
        } catch (e) {
          console.warn('Não foi possível ler o corpo do erro:', e);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#030712] border-l border-white/10 z-[160] shadow-2xl flex flex-col pt-[env(safe-area-inset-top,0px)]"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white italic tracking-tight uppercase leading-none">Seu Carrinho</h2>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-white/20" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white uppercase italic">O carrinho está vazio</p>
                    <p className="text-sm text-slate-400">Que tal adicionar alguns mantos sagrados?</p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-6 py-2 bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                  >
                    Voltar às compras
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    layout
                    key={item.product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 sm:p-4 rounded-xl sm:2xl bg-white/5 border border-white/10 flex gap-3 sm:4 group hover:border-blue-500/30 transition-all shadow-lg"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg sm:xl overflow-hidden bg-slate-900 border border-white/5 flex-shrink-0">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-xs sm:text-sm font-black text-white leading-tight line-clamp-2 uppercase italic tracking-tight">{item.product.name}</h3>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                            className="p-1 px-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.1em]">{item.product.brand}</p>
                          {item.selectedSize && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tam: {item.selectedSize}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize)}
                            className="p-1 px-2 hover:bg-white/10 text-white transition-all disabled:opacity-20"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-6 text-center text-[10px] font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                            className="p-1 px-2 hover:bg-white/10 text-white transition-all"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <p className="text-sm sm:text-base font-black text-emerald-400 italic">
                          R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl">
                {/* Cálculo de Frete - Compacto */}
                <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Simular Frete</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={zipCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setZipCode(val);
                          if (val.length === 8) handleCalculateShipping(val);
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                      />
                    </div>
                    {isCalculating && (
                      <div className="flex items-center justify-center px-2">
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {shippingInfo && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tight">
                        <span className="text-blue-400/70">Endereço de Entrega:</span>
                        {shippingInfo.isFree ? (
                          <span className="text-emerald-400 font-black">Frete Grátis ✨</span>
                        ) : (
                          <span className="text-white">
                            R$ {shippingInfo.cost.toFixed(2).replace('.', ',')} • {shippingInfo.estimatedDays} dias
                          </span>
                        )}
                      </div>
                      <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                        <p className="text-[10px] text-white font-bold leading-tight">
                          {shippingInfo.address?.street}
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium">
                          {shippingInfo.address?.neighborhood}, {shippingInfo.address?.city} - {shippingInfo.address?.state}
                        </p>
                      </div>

                      {/* Novos campos: Número e Complemento */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest pl-1">Número</label>
                          <input
                            type="text"
                            placeholder="Ex: 123"
                            value={houseNumber}
                            onChange={(e) => setHouseNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest pl-1">Comp.</label>
                          <input
                            type="text"
                            placeholder="Apto, Bloco..."
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-bold"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                   <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Subtotal</span>
                    <span className="text-white font-bold text-sm italic">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Frete</span>
                    <span className={`font-bold text-xs italic ${shippingInfo?.isFree ? 'text-emerald-400' : 'text-white'}`}>
                      {shippingInfo 
                        ? (shippingInfo.isFree ? 'Grátis' : `R$ ${shippingInfo.cost.toFixed(2).replace('.', ',')}`)
                        : '--'}
                    </span>
                  </div>
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black uppercase tracking-[0.1em] text-xs italic">Total</span>
                    <span className="text-2xl font-black text-blue-400 italic drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                      R$ {(totalPrice + (shippingInfo?.cost || 0)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isFinishing || cart.length === 0}
                  className={`w-full h-14 ${!user ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'} text-white rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isFinishing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {!user ? 'ENTRAR PARA FINALIZAR' : 'FINALIZAR PEDIDO'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-center text-[9px] text-slate-600 mt-3 uppercase font-bold tracking-widest italic leading-none">
                  🔒 Pagamento Seguro via Mercado Pago
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
