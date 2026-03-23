import { motion } from 'framer-motion';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { ShopSection } from '../components/shop/ShopSection';
import { ShoppingBag, Zap, ShieldCheck } from 'lucide-react';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col">
      <Header />
      
      <main className="flex-grow pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        {/* Hero Section da Loja */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6 italic">
                <Zap className="w-3 h-3" />
                Vestiário Oficial ZK
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter mb-6">
                LOJA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-amber-500">EXCLUSIVA</span>
              </h1>
              <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium mb-12">
                Garanta os mantos mais insanos e coleções limitadas que você só encontra aqui na ZK Oficial.
              </p>

              {/* Badges de Confiança */}
              <div className="flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Compra 100% Segura
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  Entrega em Todo Brasil
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Componente principal da Loja */}
        <ShopSection />
      </main>

      <Footer />
    </div>
  );
}
