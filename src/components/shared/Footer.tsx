import React from 'react';
import { Heart, Instagram, MessageCircle, ShieldCheck, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  const socialLinks = [
    { id: 'instagram', icon: Instagram, url: 'https://www.instagram.com/itallozkoficial', color: 'hover:text-pink-500' },
    { id: 'whatsapp', icon: MessageCircle, url: 'https://wa.me/5531972393341', color: 'hover:text-emerald-500' },
  ];

  return (
    <footer className="relative bg-[#030712]/80 backdrop-blur-2xl border-t border-amber-500/10 pt-8 pb-8 mt-auto overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link to="/" className="inline-block group">
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none group-hover:scale-105 transition-transform">
                ZK<span className="text-amber-500">.</span>OFICIAL
              </h2>
              <div className="h-1 w-12 bg-amber-500 rounded-full mt-2 group-hover:w-full transition-all duration-500" />
            </Link>
            <p className="text-slate-400/60 text-sm font-medium leading-relaxed max-w-xs">
              O maior portal de entretenimento e sorteio de recompensas para a torcida.
              Sintonize com a gente e concorra aos melhores prêmios.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-4 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-white/40 ${social.color} transition-all active:scale-90 hover:bg-white/10 hover:border-white/10`}
                >
                  <social.icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-amber-500" />
                Explorar
              </h3>
              <ul className="space-y-4">
                <li>
                  <Link to="/" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/menu" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    Perfil
                  </Link>
                </li>
                <li>
                  <Link to="/loja" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    Loja
                  </Link>
                </li>
                <li>
                  <Link to="/notifications" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    Alertas
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-amber-500" />
                Suporte
              </h3>
              <ul className="space-y-4">
                <li>
                  <Link to="/termos" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <ShieldCheck size={14} className="group-hover:text-amber-500" />
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <a target="_blank" rel="noopener noreferrer" href="https://wa.me/5531972393341" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <MessageCircle size={14} className="group-hover:text-emerald-500" />
                    WhatsApp VIP
                  </a>
                </li>
                <li>
                  <a href="mailto:contato@zkoficial.com" className="text-slate-400/60 hover:text-white text-sm font-bold uppercase italic tracking-tight transition-colors flex items-center gap-2 group">
                    <Mail size={14} className="group-hover:text-amber-400" />
                    E-mail
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-500/40 text-[10px] font-black uppercase tracking-[0.2em] text-center md:text-left">
            &copy; {year} ZK OFICIAL. TODOS OS DIREITOS RESERVADOS.
          </p>

          <div className="flex items-center gap-1.5 text-slate-400/60 text-[10px] font-black uppercase tracking-widest">
            FEITO COM <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" /> POR
            <a
              href="https://wa.me/5533999030124"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-amber-500 transition-colors"
            >
              TALES COELHO
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;