import Header from '../../components/shared/Header';
import Footer from '../../components/shared/Footer';
import { ProductManagementPanel } from '../../components/admin/ProductManagementPanel';
import { Package } from 'lucide-react';

export default function AdminShopPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 w-full">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white italic uppercase tracking-tight">Gestão da Loja ZK</h1>
            <p className="text-emerald-400/60 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em]">Catálogo de Produtos e Estoque</p>
          </div>
        </div>

        <div className="glass-panel p-2 sm:p-4 rounded-[2rem] sm:rounded-[2.5rem] bg-white/5 border border-white/10">
          <ProductManagementPanel />
        </div>
      </main>
      <Footer />
    </div>
  );
}
