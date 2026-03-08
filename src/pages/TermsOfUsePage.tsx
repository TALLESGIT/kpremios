import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronLeft, Scale, Lock, Eye, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfUsePage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Aceitação dos Termos",
      icon: Scale,
      content: "Ao acessar e utilizar o aplicativo ZK Oficial, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços."
    },
    {
      title: "2. Elegibilidade",
      icon: Eye,
      content: "Para participar de sorteios e bolões, você deve ter pelo menos 18 anos de idade. Ao criar uma conta, você declara e garante que possui a idade legal necessária e que todas as informações fornecidas são precisas e completas."
    },
    {
      title: "3. Uso Responsável",
      icon: AlertTriangle,
      content: "O ZK Oficial promove o entretenimento responsável. O uso de automação, scripts ou qualquer forma de manipulação dos resultados é estritamente proibido e resultará no banimento imediato da conta sem direito a reembolsos."
    },
    {
      title: "4. Privacidade e Dados",
      icon: Lock,
      content: "Sua privacidade é nossa prioridade. Coletamos apenas os dados necessários para o funcionamento do serviço e notificações (como tokens de push). Seus dados nunca serão compartilhados com terceiros para fins de marketing sem seu consentimento explícito."
    },
    {
      title: "5. Pagamentos e Prêmios",
      icon: ShieldCheck,
      content: "Todos os pagamentos são processados via PIX ou gateways seguros. A ZK Oficial se compromete com a transparência total na entrega de prêmios, que são realizados através dos canais oficiais documentados no aplicativo."
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white pb-20 pt-[calc(7rem+env(safe-area-inset-top,0px))] px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto relative z-10"
      >
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors group"
          >
            <ChevronLeft size={24} className="text-white/60 group-hover:text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
              Termos de <span className="text-blue-500">Uso</span>
            </h1>
            <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Última atualização: Março 2024</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 mb-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-6 mb-8 text-blue-400">
            <ShieldCheck size={48} className="opacity-50" />
            <p className="text-lg font-bold leading-tight">
              Sua segurança e transparência são os pilares da plataforma ZK Oficial.
            </p>
          </div>

          <div className="space-y-12">
            {sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <section.icon size={20} />
                  </div>
                  <h2 className="text-xl font-black uppercase italic tracking-tigh text-white">
                    {section.title}
                  </h2>
                </div>
                <p className="text-blue-100/60 leading-relaxed text-sm font-medium">
                  {section.content}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-blue-200/20 font-bold uppercase tracking-widest mb-4">
              Dúvidas ou Suporte?
            </p>
            <button
              onClick={() => window.open('https://wa.me/5531972393341', '_blank')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase italic transition-all shadow-xl shadow-blue-900/40 active:scale-95"
            >
              Falar com Suporte
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/10 font-black uppercase tracking-[0.3em]">
          ZK OFICIAL &copy; 2024 - TODOS OS DIREITOS RESERVADOS
        </p>
      </motion.div>
    </div>
  );
};

export default TermsOfUsePage;
