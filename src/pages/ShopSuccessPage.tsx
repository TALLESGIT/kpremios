import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Truck, ArrowRight, ShoppingBag, Home, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';

const ShopSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('external_reference') || searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }

    // Disparar confetes ao carregar
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [orderId]);

  async function fetchOrderDetails() {
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      setOrderData(data);
    } catch (err) {
      console.error('Erro ao buscar pedido:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10 text-center">
        {/* Ícone de Sucesso Animado */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/20 rounded-full mb-8 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent"
        >
          Pedido Confirmado!
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 text-lg font-medium mb-12"
        >
          Prepare o coração, seu manto sagrado está a caminho.
        </motion.p>

        {/* Card Principal */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl mb-12"
        >
          {/* Info Header */}
          <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/5">
            <div className="text-left">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Número do Pedido</p>
              <h3 className="text-xl font-mono font-bold text-white uppercase tracking-wider">#{orderId?.slice(0, 8) || '...'}</h3>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Status do Pagamento</p>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-black uppercase text-[10px] tracking-widest italic">Aprovado</span>
              </div>
            </div>
          </div>

          <div className="p-8 grid md:grid-cols-2 gap-8">
            {/* Coluna de Tracking */}
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold uppercase italic text-sm">Próximos Passos</h3>
              </div>
              
              <div className="space-y-6 relative ml-4">
                <div className="absolute left-[-16px] top-2 bottom-2 w-px bg-zinc-800" />
                
                <div className="relative flex items-center gap-4">
                  <div className="absolute left-[-20px] w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <div>
                    <p className="text-xs font-bold text-white uppercase italic">Pedido Recebido</p>
                    <p className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-widest leading-none">Concluído</p>
                  </div>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className="absolute left-[-20px] w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-500/20" />
                  <div>
                    <p className="text-xs font-bold text-white uppercase italic">Processando Envio</p>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest leading-none">Em andamento</p>
                  </div>
                </div>

                <div className="relative flex items-center gap-4 opacity-30">
                  <div className="absolute left-[-20px] w-2 h-2 rounded-full bg-zinc-700" />
                  <div>
                    <p className="text-xs font-bold text-white uppercase italic">Objeto Postado</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Aguardando</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna de Info de Entrega */}
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Truck className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-bold uppercase italic text-sm">Entrega & Rastreio</h3>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-zinc-400 text-xs leading-relaxed">
                  O código de rastreio será enviado para <span className="text-white font-bold">{orderData?.customer_email || 'seu e-mail'}</span> e via WhatsApp assim que o produto for postado.
                </p>
              </div>

              <div className="flex items-center gap-4 py-3 px-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <MapPin className="w-4 h-4 text-orange-400" />
                <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest">
                  Prazo estimado: 3 a 7 dias úteis
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Botões de Ação */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/loja"
            className="flex items-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-gray-200 transition-all w-full sm:w-auto justify-center"
          >
            <ShoppingBag className="w-5 h-5" />
            Continuar Comprando
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-8 py-4 bg-zinc-900 border border-zinc-700 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-zinc-800 transition-all w-full sm:w-auto justify-center"
          >
            <Home className="w-5 h-5" />
            Voltar ao Início
          </Link>
        </motion.div>

        <p className="mt-12 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          Dúvidas? Suporte no <span className="text-blue-400 cursor-pointer hover:underline italic">WhatsApp</span>
        </p>
      </div>
    </div>
  );
};

export default ShopSuccessPage;
