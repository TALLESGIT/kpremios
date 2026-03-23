import React from 'react';
import Header from '../../components/shared/Header';
import Footer from '../../components/shared/Footer';
import { ProductManagementPanel } from '../../components/admin/ProductManagementPanel';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminStorePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30">
      <Header />
      
      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/dashboard"
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5 group"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tight">Loja ZK</h1>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Catálogo e Produtos</p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="glass-panel rounded-[3rem] p-8 md:p-12 bg-slate-800/20 border border-white/5 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ProductManagementPanel />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminStorePage;
