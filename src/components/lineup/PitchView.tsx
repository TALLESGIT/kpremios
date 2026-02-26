import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { CruzeiroPlayer } from '../../types';
import { Download, RefreshCcw, Plus, X, ChevronDown, Instagram } from 'lucide-react';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';

type FormationKey = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2';

interface Position {
  id: number;
  role: 'GOL' | 'LAT' | 'ZAG' | 'MEI' | 'ATA';
  top: number;
  left: number;
}

const FORMATIONS: Record<FormationKey, Position[]> = {
  '4-3-3': [
    { id: 1, role: 'GOL', top: 88, left: 50 },
    { id: 2, role: 'LAT', top: 72, left: 15 },
    { id: 3, role: 'ZAG', top: 74, left: 35 },
    { id: 4, role: 'ZAG', top: 74, left: 65 },
    { id: 5, role: 'LAT', top: 72, left: 85 },
    { id: 6, role: 'MEI', top: 52, left: 30 },
    { id: 7, role: 'MEI', top: 56, left: 50 },
    { id: 8, role: 'MEI', top: 52, left: 70 },
    { id: 9, role: 'ATA', top: 22, left: 25 },
    { id: 10, role: 'ATA', top: 18, left: 50 },
    { id: 11, role: 'ATA', top: 22, left: 75 },
  ],
  '4-4-2': [
    { id: 1, role: 'GOL', top: 88, left: 50 },
    { id: 2, role: 'LAT', top: 72, left: 15 },
    { id: 3, role: 'ZAG', top: 74, left: 35 },
    { id: 4, role: 'ZAG', top: 74, left: 65 },
    { id: 5, role: 'LAT', top: 72, left: 85 },
    { id: 6, role: 'MEI', top: 48, left: 20 },
    { id: 7, role: 'MEI', top: 52, left: 40 },
    { id: 8, role: 'MEI', top: 52, left: 60 },
    { id: 9, role: 'MEI', top: 48, left: 80 },
    { id: 10, role: 'ATA', top: 20, left: 35 },
    { id: 11, role: 'ATA', top: 20, left: 65 },
  ],
  '3-5-2': [
    { id: 1, role: 'GOL', top: 88, left: 50 },
    { id: 2, role: 'ZAG', top: 72, left: 25 },
    { id: 3, role: 'ZAG', top: 74, left: 50 },
    { id: 4, role: 'ZAG', top: 72, left: 75 },
    { id: 5, role: 'MEI', top: 52, left: 15 },
    { id: 6, role: 'MEI', top: 45, left: 35 },
    { id: 7, role: 'MEI', top: 50, left: 50 },
    { id: 8, role: 'MEI', top: 45, left: 65 },
    { id: 9, role: 'MEI', top: 52, left: 85 },
    { id: 10, role: 'ATA', top: 20, left: 35 },
    { id: 11, role: 'ATA', top: 20, left: 65 },
  ],
  '4-2-3-1': [
    { id: 1, role: 'GOL', top: 88, left: 50 },
    { id: 2, role: 'LAT', top: 72, left: 15 },
    { id: 3, role: 'ZAG', top: 74, left: 35 },
    { id: 4, role: 'ZAG', top: 74, left: 65 },
    { id: 5, role: 'LAT', top: 72, left: 85 },
    { id: 6, role: 'MEI', top: 55, left: 35 },
    { id: 7, role: 'MEI', top: 55, left: 65 },
    { id: 8, role: 'MEI', top: 40, left: 20 },
    { id: 9, role: 'MEI', top: 38, left: 50 },
    { id: 10, role: 'MEI', top: 40, left: 80 },
    { id: 11, role: 'ATA', top: 18, left: 50 },
  ],
  '5-3-2': [
    { id: 1, role: 'GOL', top: 88, left: 50 },
    { id: 2, role: 'LAT', top: 68, left: 12 },
    { id: 3, role: 'ZAG', top: 72, left: 30 },
    { id: 4, role: 'ZAG', top: 74, left: 50 },
    { id: 5, role: 'ZAG', top: 72, left: 70 },
    { id: 6, role: 'LAT', top: 68, left: 88 },
    { id: 7, role: 'MEI', top: 48, left: 30 },
    { id: 8, role: 'MEI', top: 54, left: 50 },
    { id: 9, role: 'MEI', top: 48, left: 70 },
    { id: 10, role: 'ATA', top: 20, left: 35 },
    { id: 11, role: 'ATA', top: 20, left: 65 },
  ]
};


const PitchView: React.FC = () => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [formation, setFormation] = useState<FormationKey>('4-3-3');
  const [selectedPlayers, setSelectedPlayers] = useState<Record<number, CruzeiroPlayer | null>>({});
  const [players, setPlayers] = useState<CruzeiroPlayer[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('cruzeiro_players')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) {
        setPlayers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar jogadores:', err);
    }
  };

  const handleSelectPlayer = (player: CruzeiroPlayer) => {
    if (activeSlot !== null) {
      setSelectedPlayers({ ...selectedPlayers, [activeSlot]: player });
      setActiveSlot(null);
    }
  };

  const handleShare = async () => {
    if (!pitchRef.current) return;

    const filledSlots = Object.values(selectedPlayers).filter(p => p !== null).length;
    if (filledSlots < 11) {
      if (!window.confirm(`Você selecionou apenas ${filledSlots} jogadores. Deseja compartilhar assim mesmo?`)) return;
    }

    try {
      setSharing(true);
      toast.loading('Gerando imagem para compartilhar...', { id: 'share' });

      const canvas = await html2canvas(pitchRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: '#000814',
      });

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'meu-time-cruzeiro.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: 'Minha Escalação Ideal',
          text: 'Confira meu time do Cruzeiro! Monte o seu em zkoficial.com.br/escale',
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.download = 'meu-time-cruzeiro.png';
        link.href = dataUrl;
        link.click();
      }

      toast.success('Pronto para compartilhar!', { id: 'share' });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Erro ao gerar imagem', { id: 'share' });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg">
            <RefreshCcw className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Escalação Ideal</h2>
            <p className="text-xs text-slate-400">Monte seus 11 titulares</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <select
              value={formation}
              onChange={(e) => setFormation(e.target.value as FormationKey)}
              className="appearance-none bg-slate-800 border border-slate-700 px-4 py-2 pr-10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="4-3-3">4-3-3</option>
              <option value="4-4-2">4-4-2</option>
              <option value="3-5-2">3-5-2</option>
              <option value="4-2-3-1">4-2-3-1</option>
              <option value="5-3-2">5-3-2</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {sharing ? <Download className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
            {sharing ? 'Gerando...' : 'Gerar Foto'}
          </button>
        </div>
      </div>

      {/* Pitch View Container (Tudo que vai sair na foto quando compartilhar) */}
      <div
        ref={pitchRef}
        className="w-full bg-[#001d4a] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col relative"
      >
        {/* 1. BANNER DE TÍTULO - Fica no topo, ocupando largura total */}
        <div className="w-full bg-blue-950/95 py-5 px-4 z-30 flex flex-col items-center justify-center shadow-lg border-b border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
            <div className="w-14 h-14 bg-white rounded-full p-2 shadow-2xl flex items-center justify-center transform hover:scale-110 transition-transform flex-shrink-0">
              <img src="/zk-logo.svg" alt="ZK Oficial" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] leading-tight">
                ESCALE SEU <span className="text-blue-500 text-glow">CRUZEIRO</span> IDEAL
              </h3>
              <p className="text-[10px] sm:text-[11px] font-black text-blue-400/90 uppercase tracking-[0.4em] drop-shadow-md">
                WWW.ZKOFICIAL.COM.BR
              </p>
            </div>
          </div>
        </div>

        {/* 2. O CAMPO - Abaixo do banner */}
        <div className="relative w-full aspect-[3/4] overflow-hidden">

          {/* Fundo Gramado e Linhas */}
          <div className="absolute inset-0 bg-[#001d4a]">
            {/* Gramado listrado */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, #001d4a, #001d4a 10%, #002d6a 10%, #002d6a 20%)',
                opacity: 0.8
              }}
            ></div>

            {/* Perspectiva 3D APENAS para as linhas do campo, não para os jogadores */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ perspective: '800px' }}>
              <div
                className="w-[90%] h-[90%] border-2 border-white/20 relative rounded-lg"
                style={{ transform: 'rotateX(20deg)' }}
              >
                {/* Desenhos do campo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-2 border-t-0 border-white/20 rounded-b-lg"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-2 border-b-0 border-white/20 rounded-t-lg"></div>
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Marca d'água no campo */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
            <Instagram className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-bold text-[10px] tracking-wide">@itallozk</span>
          </div>

          {/* Camada de Jogadores - Sem rotação 3D para não distorcer a posição */}
          <div className="absolute inset-0 z-20">
            {FORMATIONS[formation].map((pos) => {
              const player = selectedPlayers[pos.id];

              return (
                <motion.button
                  key={`${formation}-${pos.id}`}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => {
                    setActiveSlot(pos.id);
                  }}
                  style={{
                    top: `${pos.top}%`,
                    left: `${pos.left}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                >
                  {/* Slot do Jogador */}
                  <div className={`
                      relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] transition-all duration-300
                      ${player
                      ? 'border-blue-400 bg-blue-900 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                      : 'border-white/20 bg-white/5 hover:border-white/50 hover:bg-white/10'
                    }
                      flex items-center justify-center overflow-hidden
                    `}>
                    {player ? (
                      <>
                        <img
                          src={player.photo_url || ''}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Número da camisa */}
                        <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-[#001d4a]">
                          <span className="text-[10px] font-bold text-white">{player.number}</span>
                        </div>
                      </>
                    ) : (
                      <Plus className="w-6 h-6 text-white/30 group-hover:text-white" />
                    )}
                  </div>

                  {/* Nome do Jogador */}
                  <div className={`
                      mt-1 px-2 py-0.5 rounded-md backdrop-blur-sm border transition-all
                      ${player
                      ? 'bg-blue-600/80 border-blue-400/30'
                      : 'bg-black/40 border-white/10'
                    }
                    `}>
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                      {player ? player.name : pos.role}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Instructions */}
      <div className="text-center mt-2 px-8">
        <p className="text-slate-500 text-[11px] font-medium leading-relaxed uppercase tracking-widest bg-white/5 py-4 rounded-3xl border border-white/5">
          TÁCTICA: Selecione sua formação e clique nos slots para montar o time. Quando estiver pronto, use o botão "Gerar Foto".
        </p>
      </div>

      {/* Player Selector Modal */}
      <AnimatePresence>
        {activeSlot !== null && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSlot(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="relative w-full max-w-lg bg-[#000814] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Atletas Disponíveis</h3>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-1">
                    Posição: <span className="text-white">{FORMATIONS[formation].find(p => p.id === activeSlot)?.role}</span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveSlot(null)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                <div className="flex flex-col gap-3">
                  {/* Strict position-based filtering: ONLY show players of this position */}
                  {players
                    .filter(p => p.position === FORMATIONS[formation].find(pos => pos.id === activeSlot)?.role)
                    .map(player => (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(player)}
                        className="flex items-center gap-5 p-4 rounded-3xl bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/50 transition-all text-left group"
                      >
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 group-hover:scale-110 transition-transform">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xl">{player.position[0]}</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors uppercase italic">{player.name}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{player.full_name || 'Elenco Profissional'}</p>
                        </div>
                        <div className="text-right pr-2">
                          <span className="text-3xl font-black text-white/5 group-hover:text-blue-500/40 transition-all italic tracking-tighter">#{player.number}</span>
                        </div>
                      </button>
                    ))
                  }

                  {players.filter(p => p.position === FORMATIONS[formation].find(pos => pos.id === activeSlot)?.role).length === 0 && (
                    <div className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Nenhum jogador encontrado para esta posição no banco de dados.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PitchView;
