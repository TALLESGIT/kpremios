import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { CruzeiroPlayer, CruzeiroGame } from '../../types';
import { X, ChevronDown, Instagram, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { toBlob } from 'html-to-image';

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
    { id: 1, role: 'GOL', top: 78, left: 44 },
    { id: 2, role: 'LAT', top: 68, left: 5 },
    { id: 3, role: 'ZAG', top: 70, left: 25 },
    { id: 4, role: 'ZAG', top: 70, left: 60 },
    { id: 5, role: 'LAT', top: 68, left: 80 },
    { id: 6, role: 'MEI', top: 35, left: 42 },
    { id: 7, role: 'MEI', top: 49, left: 24 },
    { id: 8, role: 'MEI', top: 49, left: 60 },
    { id: 9, role: 'ATA', top: 20, left: 7 },
    { id: 10, role: 'ATA', top: 7, left: 44 },
    { id: 11, role: 'ATA', top: 20, left: 79 },
  ],
  '4-4-2': [
    { id: 1, role: 'GOL', top: 78, left: 43 },
    { id: 2, role: 'LAT', top: 68, left: 5 },
    { id: 3, role: 'ZAG', top: 70, left: 25 },
    { id: 4, role: 'ZAG', top: 70, left: 60 },
    { id: 5, role: 'LAT', top: 68, left: 80 },
    { id: 6, role: 'MEI', top: 46, left: 30 },
    { id: 7, role: 'MEI', top: 46, left: 55 },
    { id: 8, role: 'MEI', top: 32, left: 8 },
    { id: 9, role: 'MEI', top: 32, left: 79 },
    { id: 10, role: 'ATA', top: 9, left: 20 },
    { id: 11, role: 'ATA', top: 9, left: 65 },
  ],
  '3-5-2': [
    { id: 1, role: 'GOL', top: 83, left: 44 },
    { id: 2, role: 'ZAG', top: 66, left: 18 },
    { id: 3, role: 'ZAG', top: 64, left: 43 },
    { id: 4, role: 'ZAG', top: 66, left: 68 },
    { id: 5, role: 'MEI', top: 37, left: 7 },
    { id: 6, role: 'MEI', top: 45, left: 30 },
    { id: 7, role: 'MEI', top: 28, left: 43 },
    { id: 8, role: 'MEI', top: 45, left: 55 },
    { id: 9, role: 'MEI', top: 37, left: 79 },
    { id: 10, role: 'ATA', top: 10, left: 21 },
    { id: 11, role: 'ATA', top: 10, left: 65 },
  ],
  '4-2-3-1': [
    { id: 1, role: 'GOL', top: 78, left: 44 },
    { id: 2, role: 'LAT', top: 70, left: 5 },
    { id: 3, role: 'ZAG', top: 72, left: 25 },
    { id: 4, role: 'ZAG', top: 72, left: 60 },
    { id: 5, role: 'LAT', top: 70, left: 80 },
    { id: 6, role: 'MEI', top: 52, left: 30 },
    { id: 7, role: 'MEI', top: 52, left: 60 },
    { id: 8, role: 'MEI', top: 32, left: 9 },
    { id: 9, role: 'MEI', top: 20, left: 44 },
    { id: 10, role: 'MEI', top: 32, left: 78 },
    { id: 11, role: 'ATA', top: 3, left: 44 },
  ],
  '5-3-2': [
    { id: 1, role: 'GOL', top: 83, left: 44 },
    { id: 2, role: 'LAT', top: 51, left: 7 },
    { id: 3, role: 'ZAG', top: 59, left: 23 },
    { id: 4, role: 'ZAG', top: 64, left: 44 },
    { id: 5, role: 'ZAG', top: 59, left: 66 },
    { id: 6, role: 'LAT', top: 51, left: 81 },
    { id: 7, role: 'MEI', top: 30, left: 23 },
    { id: 8, role: 'MEI', top: 43, left: 44 },
    { id: 9, role: 'MEI', top: 30, left: 70 },
    { id: 10, role: 'ATA', top: 7, left: 21 },
    { id: 11, role: 'ATA', top: 7, left: 65 },
  ]
};

const POSITION_ICONS: Record<string, string> = {
  GOL: '/logos/cruzeiro.png', // Logo padrão
  LAT: '/logos/cruzeiro.png',
  ZAG: '/logos/cruzeiro.png',
  MEI: '/logos/cruzeiro.png',
  ATA: '/logos/cruzeiro.png',
};

const ModernPitchView: React.FC = () => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [formation, setFormation] = useState<FormationKey>('4-4-2');
  const [selectedPlayers, setSelectedPlayers] = useState<Record<number, CruzeiroPlayer | null>>({});
  const [players, setPlayers] = useState<CruzeiroPlayer[]>([]);
  const [nextGame, setNextGame] = useState<CruzeiroGame | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState<string | null>(null);

  const isTeamComplete = Object.values(selectedPlayers).filter(p => p !== null).length === 11;

  useEffect(() => {
    loadPlayers();
    loadNextGame();
  }, []);

  const loadNextGame = async () => {
    try {
      const { data, error } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .eq('status', 'upcoming')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setNextGame(data);
    } catch (err) {
      console.error('Error loading next game:', err);
    }
  };

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
      const loadingToast = toast.loading('Gerando imagem para compartilhar...');

      // 1. Garantir carregamento
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Gerar o Blob diretamente (mais eficiente para arquivos)
      const blob = await toBlob(pitchRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        style: {
          borderRadius: '0',
        }
      });

      if (!blob) throw new Error('Falha ao gerar imagem');

      // 3. Criar o arquivo
      const file = new File([blob], 'meu-time-zk.png', { type: 'image/png' });

      toast.dismiss(loadingToast);

      // Função de fallback: Download e aviso
      const triggerDownloadFallback = () => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'minha-escalacao-zk.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Imagem baixada! Agora você pode compartilhar nas redes sociais.', {
          duration: 5000
        });
      };

      // 4. Tentativa de Compartilhamento Nativo (Redes Sociais)
      if (navigator.share) {
        try {
          // Tenta compartilhar o arquivo diretamente
          await navigator.share({
            title: 'Minha Escalação no ZK',
            text: 'Confira meu time ideal do Cruzeiro!',
            files: [file],
          });
        } catch (shareError: any) {
          // Se for AbortError, o usuário só fechou a janela. Não fazemos nada.
          if (shareError.name === 'AbortError') return;

          // Se falhou por outro motivo (ex: arquivo não suportado no WebView), tenta download
          console.error('Erro no share nativo:', shareError);
          triggerDownloadFallback();
        }
      } else {
        // Sem suporte ao Share API (Desktop ou navegadores antigos)
        triggerDownloadFallback();
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
    const matchesPos = !filterPos ? true : (
      (filterPos as any) === 'GOL' ? ((p.position as any) === 'Goleiro' || (p.position as any) === 'GOL') :
        (filterPos as any) === 'ZAG' ? ((p.position as any) === 'Zagueiro' || (p.position as any) === 'ZAG') :
          (filterPos as any) === 'LAT' ? (
            (p.position as any) === 'Lateral Direito' ||
            (p.position as any) === 'Lateral Esquerdo' ||
            (p.position as any) === 'LAT'
          ) :
            (filterPos as any) === 'MEI' ? (
              (p.position as any) === 'Meio-Campista' ||
              (p.position as any) === 'Volante' ||
              (p.position as any) === 'Meia/Atacante' ||
              (p.position as any) === 'MEI'
            ) :
              (filterPos as any) === 'ATA' ? (
                (p.position as any) === 'Atacante' ||
                (p.position as any) === 'Centroavante' ||
                (p.position as any) === 'Meia/Atacante' ||
                (p.position as any) === 'ATA'
              ) :
                true
    );
    return matchesSearch && matchesPos;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto items-center justify-center">
      {/* Controles de Topo */}
      <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center justify-center gap-2 w-full px-2">
        <div className="relative col-span-2 sm:col-span-1 border-2 border-white/20 rounded-lg overflow-hidden">
          <select
            value={formation}
            onChange={(e) => setFormation(e.target.value as FormationKey)}
            className="w-full appearance-none bg-[#0055ff] px-3 py-2.5 pr-8 text-white font-black text-xs outline-none cursor-pointer shadow-xl transition-all"
          >
            {Object.keys(FORMATIONS).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-white absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={() => setSelectedPlayers({})}
          className="flex-1 px-3 py-2.5 bg-[#0055ff] text-white rounded-lg font-black text-[10px] uppercase shadow-xl active:scale-95 border-2 border-white/20 transition-all"
        >
          Limpar
        </button>

        <button
          onClick={handleShare}
          disabled={sharing || !isTeamComplete}
          className={`col-span-2 sm:flex-1 px-3 py-2.5 bg-[#0055ff] text-white rounded-lg font-black text-[10px] uppercase shadow-xl active:scale-95 border-2 border-white/20 transition-all ${(!isTeamComplete && !sharing) ? 'opacity-30 cursor-not-allowed grayscale' : 'opacity-100'}`}
        >
          {sharing ? 'Gerando...' : isTeamComplete ? 'Compartilhar' : 'Escalar 11 para Compartilhar'}
        </button>
      </div>

      {/* CONTAINER DO CAMPO (O que sai na foto) */}
      <div
        ref={pitchRef}
        data-pitch-view="true"
        className="w-full bg-[#0055ff] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 flex flex-col relative"
      >
        {/* 1. BANNER DE TÍTULO - Fica em cima, separadinho! */}
        <div className="w-full bg-[#0033aa] py-3 px-4 z-30 flex flex-col items-center shadow-lg border-b-2 border-blue-900/50">
          <div className="flex items-center justify-between w-full max-w-md gap-2">

            {/* Cruzeiro Logo */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full p-1 shadow-xl border-2 border-primary flex items-center justify-center">
                <img
                  src="/logos/cruzeiro.png"
                  alt="Cruzeiro"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <span className="text-[7px] sm:text-[9px] font-black text-white italic uppercase tracking-tighter">CRUZEIRO</span>
            </div>

            {/* VS & Title Area */}
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-[1px] w-4 sm:w-8 bg-blue-400/50"></div>
                <span className="text-[10px] sm:text-xs font-black italic text-blue-300 uppercase tracking-widest">VS</span>
                <div className="h-[1px] w-4 sm:w-8 bg-blue-400/50"></div>
              </div>

              <h2 className="titulo-principal text-sm sm:text-xl font-black italic uppercase tracking-tighter text-white text-center drop-shadow-md"
                style={{ lineHeight: '1.2', display: 'block' }}>
                ESCALAÇÃO IDEAL
              </h2>

              <a
                href="https://www.zkoficial.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 mt-2"
              >
                <span className="text-[8px] sm:text-[10px] font-bold text-blue-200 group-hover:text-white transition-colors uppercase tracking-[0.2em]">
                  WWW.ZKOFICIAL.COM.BR
                </span>
                <ChevronDown className="w-2 h-2 sm:w-3 sm:h-3 text-blue-300 group-hover:text-white rotate-[-90deg]" />
              </a>
            </div>

            {/* Opponent Logo */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-full p-1.5 shadow-xl border-2 border-white/20 flex items-center justify-center overflow-hidden">
                {nextGame?.opponent_logo ? (
                  <img
                    src={nextGame.opponent_logo}
                    alt={nextGame.opponent}
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-900/40">
                    <Search className="w-4 h-4 sm:w-6 sm:h-6 text-white/20" />
                  </div>
                )}
              </div>
              <span className="text-[7px] sm:text-[9px] font-black text-white/70 italic uppercase tracking-tighter truncate max-w-[80px] text-center">
                {nextGame?.opponent || 'ADVERSÁRIO'}
              </span>
            </div>

          </div>

          {nextGame && (
            <div className="mt-2 flex items-center gap-3">
              <div className="px-2 py-0.5 bg-blue-800/50 border border-blue-400/20 rounded-full h-[18px] sm:h-[22px] flex items-center justify-center">
                <span
                  style={{ lineHeight: '1', display: 'block' }}
                  className="text-[7px] sm:text-[9px] font-bold text-blue-100 uppercase tracking-widest whitespace-nowrap"
                >
                  {nextGame.competition}
                </span>
              </div>
              <div className="w-1 h-1 bg-blue-400 rounded-full opacity-50 shrink-0"></div>
              <span
                style={{ lineHeight: '1', display: 'block' }}
                className="text-[7px] sm:text-[9px] font-bold text-blue-300 uppercase tracking-widest whitespace-nowrap"
              >
                {nextGame.venue}
              </span>
            </div>
          )}
        </div>

        {/* 2. O GRAMADO - Agora os jogadores mapeiam perfeitamente aqui dentro */}
        <div className="relative w-full aspect-[3/4]">
          {/* Fundo Gramado Azul */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, #0055ff 0%, #0055ff 50%, #0066ff 50%, #0066ff 100%)',
              backgroundSize: '100% 40px',
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

          <div
            className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-30 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 sm:py-2 rounded-full border border-white/20 shadow-2xl insta-badge"
          >
            <Instagram className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            <span
              style={{ lineHeight: '1.2' }}
              className="text-white font-black text-[9px] sm:text-[11px] tracking-wide"
            >
              @itallozkoficial
            </span>
          </div>

          {/* Jogadores (Player Slots) */}
          {FORMATIONS[formation].map((pos) => {
            const player = selectedPlayers[pos.id];

            return (
              <motion.button
                key={`${formation}-${pos.id}`}
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
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 group player-slot-container"
              >
                {/* Player Circle Slot */}
                <div className={`
                  relative w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 sm:border-[3px] transition-all duration-300
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
                    <img
                      src={POSITION_ICONS[pos.role]}
                      alt="Adicionar jogador"
                      className="w-full h-full object-contain opacity-40 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </div>

                <div className={`
                  mt-1 w-[70px] h-[20px] rounded-lg shadow-xl border player-label
                  ${player ? 'bg-white border-blue-600' : 'bg-blue-900/60 border-white/20'}
                `} style={{ display: 'block', textAlign: 'center' }}>
                  <span className={`texto-jogador font-black uppercase tracking-tighter italic block
                    ${player ? 'text-blue-700' : 'text-white/80'}
                  `} style={{
                      display: 'block',
                      fontSize: '9px',
                      lineHeight: '20px', // O mesmo tamanho da div para centralizar no print
                      height: '20px',
                      margin: '0 auto'
                    }}>
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
              <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100 flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-black text-gray-800 uppercase italic leading-tight">Escolha o {filterPos}</h3>
                  <button
                    onClick={() => {
                      setActiveSlot(null);
                      setSearchTerm('');
                    }}
                    className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar jogador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl sm:rounded-2xl py-2 sm:py-3 px-10 text-xs sm:text-sm font-bold text-gray-700 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {filteredPlayers.map(player => {
                    const isSelected = Object.values(selectedPlayers).some(p => p?.id === player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(player)}
                        className={`flex flex-col items-center p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl transition-all border-2 sm:border-4
                          ${isSelected
                            ? 'bg-blue-700 border-yellow-400 scale-105 shadow-xl'
                            : 'bg-[#0055ff] border-transparent hover:bg-blue-600 hover:scale-105'
                          } active:scale-95`}
                      >
                        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/20 mb-2 sm:mb-3 bg-white/10 shadow-inner">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50 font-black text-lg sm:text-2xl italic bg-blue-800">ZK</div>
                          )}
                        </div>
                        <h4 className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tighter text-center line-clamp-1">{player.name}</h4>
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
    </div >
  );
};

export default ModernPitchView;