import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { CruzeiroPlayer } from '../../types';
import { Download, RefreshCcw, Plus, X, ChevronDown, Instagram, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';

type FormationKey = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2';

interface Position {
  id: number;
  role: 'GOL' | 'LAT' | 'ZAG' | 'MEI' | 'ATA';
  top: number;
  left: number;
}

// COORDENADAS CORRIGIDAS: Espalhadas pelo campo todo!
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

const ModernPitchView: React.FC = () => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [formation, setFormation] = useState<FormationKey>('4-4-2');
  const [selectedPlayers, setSelectedPlayers] = useState<Record<number, CruzeiroPlayer | null>>({});
  const [players, setPlayers] = useState<CruzeiroPlayer[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState<string | null>(null);

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
      const existingSlot = Object.keys(selectedPlayers).find(
        key => selectedPlayers[parseInt(key)]?.id === player.id
      );
      
      let newSelected = { ...selectedPlayers };
      if (existingSlot) {
        newSelected[parseInt(existingSlot)] = null;
      }
      
      newSelected[activeSlot] = player;
      setSelectedPlayers(newSelected);
      setActiveSlot(null);
    }
  };

  const handleShare = async () => {
    if (!pitchRef.current) return;

    try {
      setSharing(true);
      const loadingToast = toast.loading('Preparando sua escalação...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(pitchRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#0055ff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'meu-time-cruzeiro.png', { type: 'image/png' });

      toast.dismiss(loadingToast);

      if (navigator.share) {
        await navigator.share({
          title: 'Minha Escalação do Cruzeiro',
          text: 'Confira meu time ideal do Cruzeiro! Monte o seu no app ZK Oficial.',
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.download = 'minha-escalacao-zk.png';
        link.href = dataUrl;
        link.click();
        toast.success('Imagem baixada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Erro ao gerar imagem.');
    } finally {
      setSharing(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPos = filterPos ? p.position === filterPos : true;
    return matchesSearch && matchesPos;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto items-center justify-center">
      {/* Controles de Topo */}
      <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center justify-center gap-2 w-full px-2">
        <div className="relative col-span-2 sm:col-span-1">
          <select
            value={formation}
            onChange={(e) => setFormation(e.target.value as FormationKey)}
            className="w-full appearance-none bg-[#0055ff] border-2 border-white/20 px-3 py-2.5 pr-8 rounded-lg text-white font-black text-xs outline-none cursor-pointer shadow-xl transition-all"
          >
            {Object.keys(FORMATIONS).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-white absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={() => toast.success('Escalação salva!')}
          className="flex-1 px-3 py-2.5 bg-[#0055ff] text-white rounded-lg font-black text-[10px] uppercase shadow-xl active:scale-95 border-2 border-white/20 transition-all"
        >
          Salvar
        </button>

        <button
          onClick={() => setSelectedPlayers({})}
          className="flex-1 px-3 py-2.5 bg-[#0055ff] text-white rounded-lg font-black text-[10px] uppercase shadow-xl active:scale-95 border-2 border-white/20 transition-all"
        >
          Limpar
        </button>

        <button
          onClick={handleShare}
          disabled={sharing}
          className="col-span-2 sm:flex-1 px-3 py-2.5 bg-[#0055ff] text-white rounded-lg font-black text-[10px] uppercase shadow-xl active:scale-95 border-2 border-white/20 transition-all disabled:opacity-50"
        >
          {sharing ? 'Gerando...' : 'Salvar foto'}
        </button>
      </div>

      {/* CONTAINER DO CAMPO (O que sai na foto) */}
      <div 
        ref={pitchRef}
        className="w-full bg-[#0055ff] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 flex flex-col relative"
      >
        {/* 1. BANNER DE TÍTULO - Fica em cima, separadinho! */}
        <div className="w-full bg-[#0033aa] py-4 px-4 z-30 flex flex-col items-center shadow-lg border-b-2 border-blue-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full p-2 shadow-xl border-2 border-blue-600 flex-shrink-0">
              <img src="/zk-logo.svg" alt="ZK" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h2 className="text-lg sm:text-2xl font-black italic uppercase tracking-tighter text-white leading-none">
                ESCALE SEU CRUZEIRO IDEAL
              </h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-1">
                WWW.ZKOFICIAL.COM.BR
              </p>
            </div>
          </div>
        </div>

        {/* 2. O GRAMADO - Agora os jogadores mapeiam perfeitamente aqui dentro */}
        <div className="relative w-full aspect-[3/4]">
          {/* Fundo Gramado Azul */}
          <div 
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(0deg, #0055ff, #0055ff 10%, #0066ff 10%, #0066ff 20%)`,
            }}
          ></div>

          {/* Linhas do Campo */}
          <div className="absolute inset-0 p-4 sm:p-6 pointer-events-none">
            <div className="w-full h-full border-2 border-white/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-white/40 rounded-full"></div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-20 sm:h-28 border-2 border-b-0 border-white/40 rounded-t-xl"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-20 sm:h-28 border-2 border-t-0 border-white/40 rounded-b-xl"></div>
            </div>
          </div>

          {/* MARCA D'ÁGUA DO INSTAGRAM (@itallozk) */}
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-xl pointer-events-none">
            <Instagram className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-bold text-[10px] sm:text-xs tracking-wide">
              @itallozk
            </span>
          </div>

          {/* Jogadores (Player Slots) */}
          {FORMATIONS[formation].map((pos) => {
            const player = selectedPlayers[pos.id];
            
            return (
              <motion.button
                key={`${formation}-${pos.id}`}
                layout
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setActiveSlot(pos.id);
                  setFilterPos(pos.role);
                }}
                style={{
                  top: `${pos.top}%`,
                  left: `${pos.left}%`,
                }}
                // A CLASSE MÁGICA QUE CENTRALIZA: -translate-x-1/2 -translate-y-1/2
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 group"
              >
                {/* Player Circle Slot */}
                <div className={`
                  relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 transition-all duration-300
                  ${player 
                    ? 'border-white bg-white shadow-2xl' 
                    : 'border-white/50 bg-white/20 hover:bg-white/40'
                  }
                  flex items-center justify-center overflow-hidden
                `}>
                  {player ? (
                    <img 
                      src={player.photo_url || ''} 
                      alt={player.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ZK&background=0055ff&color=fff';
                      }}
                    />
                  ) : (
                    <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-blue-900/50 group-hover:text-blue-900" strokeWidth={5} />
                  )}
                </div>

                {/* Player Name Label */}
                <div className={`
                  mt-1 sm:mt-1.5 px-2 py-0.5 rounded-lg shadow-xl border transition-all
                  ${player ? 'bg-white border-blue-600' : 'bg-blue-900/60 border-white/20'}
                `}>
                  <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tighter whitespace-nowrap italic
                    ${player ? 'text-blue-700' : 'text-white/80'}
                  `}>
                    {player ? player.name : pos.role}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Modal de Seleção de Jogador */}
      <AnimatePresence>
        {activeSlot !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSlot(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header do Modal */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-800 uppercase italic">Escolha o {filterPos}</h3>
                <button
                  onClick={() => setActiveSlot(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Lista Grid */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="grid grid-cols-2 gap-4">
                  {filteredPlayers.map(player => {
                    const isSelected = Object.values(selectedPlayers).some(p => p?.id === player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(player)}
                        className={`flex flex-col items-center p-4 rounded-3xl transition-all border-4
                          ${isSelected 
                            ? 'bg-blue-700 border-yellow-400 scale-105 shadow-xl' 
                            : 'bg-[#0055ff] border-transparent hover:bg-blue-600 hover:scale-105'
                          } active:scale-95`}
                      >
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 mb-3 bg-white/10 shadow-inner">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50 font-black text-2xl italic bg-blue-800">ZK</div>
                          )}
                        </div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-tighter text-center line-clamp-1">{player.name}</h4>
                      </button>
                    );
                  })}

                  {filteredPlayers.length === 0 && (
                    <div className="col-span-2 py-20 text-center opacity-30">
                      <p className="text-sm font-black uppercase text-gray-500">Nenhum atleta</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>)}
      </AnimatePresence>
    </div>
  );
};

export default ModernPitchView;