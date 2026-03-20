import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import {
  X,
  Share2,
  RefreshCcw,
  Instagram,
  Search,
  Filter,
  Trophy
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { toBlob } from 'html-to-image';
import { getTeamLogo, getTeamInitials } from '../../utils/teamLogos';

// ─── Types ───────────────────────────────────────────────────────────────────
import { CruzeiroPlayer, CruzeiroGame } from '../../types';

type FormationKey = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2';

interface Position {
  id: number;
  role: 'GOL' | 'LAT' | 'ZAG' | 'MEI' | 'ATA';
  top: number;
  left: number;
}

// ─── Formações ───────────────────────────────────────────────────────────────
const FORMATIONS: Record<FormationKey, Position[]> = {
  '4-4-2': [
    { id: 1, role: 'GOL', top: 90, left: 50 },
    { id: 2, role: 'LAT', top: 75, left: 15 },
    { id: 3, role: 'ZAG', top: 80, left: 35 },
    { id: 4, role: 'ZAG', top: 80, left: 65 },
    { id: 5, role: 'LAT', top: 75, left: 85 },
    { id: 6, role: 'MEI', top: 58, left: 38 },
    { id: 7, role: 'MEI', top: 58, left: 62 },
    { id: 8, role: 'MEI', top: 40, left: 18 },
    { id: 9, role: 'MEI', top: 40, left: 82 },
    { id: 10, role: 'ATA', top: 15, left: 32 },
    { id: 11, role: 'ATA', top: 15, left: 68 },
  ],
  '4-3-3': [
    { id: 1, role: 'GOL', top: 90, left: 50 },
    { id: 2, role: 'LAT', top: 75, left: 15 },
    { id: 3, role: 'ZAG', top: 80, left: 35 },
    { id: 4, role: 'ZAG', top: 80, left: 65 },
    { id: 5, role: 'LAT', top: 75, left: 85 },
    { id: 6, role: 'MEI', top: 55, left: 50 },
    { id: 7, role: 'MEI', top: 45, left: 22 },
    { id: 8, role: 'MEI', top: 45, left: 78 },
    { id: 9, role: 'ATA', top: 18, left: 15 },
    { id: 10, role: 'ATA', top: 8, left: 50 },
    { id: 11, role: 'ATA', top: 18, left: 85 },
  ],
  '3-5-2': [
    { id: 1, role: 'GOL', top: 90, left: 50 },
    { id: 2, role: 'ZAG', top: 75, left: 25 },
    { id: 3, role: 'ZAG', top: 75, left: 50 },
    { id: 4, role: 'ZAG', top: 75, left: 75 },
    { id: 5, role: 'MEI', top: 48, left: 12 },
    { id: 6, role: 'MEI', top: 58, left: 35 },
    { id: 7, role: 'MEI', top: 38, left: 50 },
    { id: 8, role: 'MEI', top: 58, left: 65 },
    { id: 9, role: 'MEI', top: 48, left: 88 },
    { id: 10, role: 'ATA', top: 15, left: 32 },
    { id: 11, role: 'ATA', top: 15, left: 68 },
  ],
  '4-2-3-1': [
    { id: 1, role: 'GOL', top: 90, left: 50 },
    { id: 2, role: 'LAT', top: 75, left: 15 },
    { id: 3, role: 'ZAG', top: 80, left: 35 },
    { id: 4, role: 'ZAG', top: 80, left: 65 },
    { id: 5, role: 'LAT', top: 75, left: 85 },
    { id: 6, role: 'MEI', top: 62, left: 35 },
    { id: 7, role: 'MEI', top: 62, left: 65 },
    { id: 8, role: 'MEI', top: 42, left: 18 },
    { id: 9, role: 'MEI', top: 32, left: 50 },
    { id: 10, role: 'MEI', top: 42, left: 82 },
    { id: 11, role: 'ATA', top: 12, left: 50 },
  ],
  '5-3-2': [
    { id: 1, role: 'GOL', top: 90, left: 50 },
    { id: 2, role: 'LAT', top: 62, left: 15 },
    { id: 3, role: 'ZAG', top: 75, left: 28 },
    { id: 4, role: 'ZAG', top: 82, left: 50 },
    { id: 5, role: 'ZAG', top: 75, left: 72 },
    { id: 6, role: 'LAT', top: 62, left: 85 },
    { id: 7, role: 'MEI', top: 42, left: 25 },
    { id: 8, role: 'MEI', top: 50, left: 50 },
    { id: 9, role: 'MEI', top: 42, left: 75 },
    { id: 10, role: 'ATA', top: 15, left: 32 },
    { id: 11, role: 'ATA', top: 15, left: 68 },
  ],
};

// ─── Helper: logo adversário ──────────────────────────────────────────────────
// Removida duplicata de getTeamInitials pois agora importamos do utilitário

// ─── Componente principal ─────────────────────────────────────────────────────
const ModernPitchView: React.FC = () => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [formation, setFormation] = useState<FormationKey>('4-4-2');
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [homePlayers, setHomePlayers] = useState<Record<number, CruzeiroPlayer | null>>({});
  const [awayPlayers, setAwayPlayers] = useState<Record<number, CruzeiroPlayer | null>>({});
  const [players, setPlayers] = useState<CruzeiroPlayer[]>([]);
  const [nextGame, setNextGame] = useState<CruzeiroGame | null>(null);
  const [opponentImgError, setOpponentImgError] = useState(false);
  const [cruzeiroImgError, setCruzeiroImgError] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [opponentPlayers, setOpponentPlayers] = useState<CruzeiroPlayer[]>([]);
  const [loadingOpponents, setLoadingOpponents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState<string | null>(null);

  const currentSelectedState = activeTeam === 'home' ? homePlayers : awayPlayers;
  const setCurrentSelectedState = activeTeam === 'home' ? setHomePlayers : setAwayPlayers;

  const isTeamComplete =
    Object.values(currentSelectedState).filter((p) => p !== null).length === 11;

  useEffect(() => {
    loadPlayers();
    loadNextGame(); // Keep this here for initial load of next game
  }, []);

  const loadNextGame = async () => {
    try {
      const { data } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) { setNextGame(data); return; }

      const { data: recent } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .eq('status', 'finished')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent) setNextGame(recent);
    } catch (err) {
      console.error('Erro ao carregar próximo jogo:', err);
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('cruzeiro_players')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) setPlayers(data);
    } catch (err) {
      console.error('Erro ao carregar jogadores:', err);
    }
  };

  const loadOpponentPlayers = useCallback(async () => {
    if (!nextGame) return;
    try {
      setLoadingOpponents(true);

      const opponentId = nextGame.is_home
        ? nextGame.api_away_team_id
        : nextGame.api_home_team_id;

      if (!opponentId) {
        setOpponentPlayers([]);
        setLoadingOpponents(false); // Ensure loading state is reset
        return;
      }

      const { data, error } = await supabase
        .from('opponent_players')
        .select('*')
        .eq('team_id', opponentId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setOpponentPlayers(data || []);
    } catch (err) {
      console.error('Erro ao carregar jogadores adversários:', err);
    } finally {
      setLoadingOpponents(false);
    }
  }, [nextGame]);

  useEffect(() => {
    if (activeTeam === 'away' && opponentPlayers.length === 0) {
      loadOpponentPlayers();
    }
  }, [activeTeam, loadOpponentPlayers, opponentPlayers.length]);

  const handleSelectPlayer = (player: CruzeiroPlayer) => {
    if (activeSlot === null) return;

    const existingSlot = Object.keys(currentSelectedState).find(
      (key) => currentSelectedState[parseInt(key)]?.id === player.id
    );

    const newSelected = { ...currentSelectedState };
    if (existingSlot) newSelected[parseInt(existingSlot)] = null;
    newSelected[activeSlot] = player;

    setCurrentSelectedState(newSelected);
    setActiveSlot(null);
    setSearchTerm('');
  };

  // ─── Compartilhamento (100% Web) ──────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!pitchRef.current) return;
    try {
      setSharing(true);
      const loadingToast = toast.loading('Gerando imagem...');

      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 1500)); // Aumentado para 1.5s

      const blob = await toBlob(pitchRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true, // Adicionado cacheBust
        style: { borderRadius: '0' },
      });

      toast.dismiss(loadingToast);
      if (!blob) throw new Error('Falha ao gerar imagem');

      const file = new File([blob], 'minha-escalacao-zk.png', { type: 'image/png' });

      // Tenta Web Share API (mobile Chrome / Safari)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Minha Escalação no ZK',
          text: 'Confira meu time ideal do Cruzeiro! ⚽ @zkoficial',
          files: [file],
        });
        return;
      }

      // Fallback: download direto
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'minha-escalacao-zk.png';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('📸 Imagem salva! Compartilhe nas redes sociais.', { duration: 4000 });
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Usuário cancelou
      console.error('Erro ao compartilhar:', err);
      toast.error('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setSharing(false);
    }
  }, []);

  // ─── Filtro de jogadores ──────────────────────────────────────────────────
  const currentPlayerList = activeTeam === 'home' ? players : opponentPlayers;

  const filteredPlayers = currentPlayerList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!filterPos) return matchesSearch;
    const pos = (p.position || '').toUpperCase();
    if (filterPos === 'GOL') return matchesSearch && (pos.includes('GOLEIRO') || pos.includes('GOL'));
    if (filterPos === 'ZAG') return matchesSearch && (pos.includes('ZAGUEIRO') || pos.includes('ZAG'));
    if (filterPos === 'LAT') return matchesSearch && (pos.includes('LATERAL') || pos.includes('LAT'));
    if (filterPos === 'MEI')
      return matchesSearch && (pos.includes('MEIO') || pos.includes('VOLANTE') || pos.includes('MEI') || pos.includes('MEIA'));
    if (filterPos === 'ATA')
      return matchesSearch && (pos.includes('ATACANTE') || pos.includes('CENTROAVANTE') || pos.includes('ATA') || pos.includes('PONTA'));
    return matchesSearch;
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto items-center justify-center p-2">
      {/* Controles Superiores */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {/* Formação */}
        <div className="relative border border-white/10 rounded-2xl overflow-hidden shadow-lg backdrop-blur-xl bg-black/20">
          <select
            value={formation}
            onChange={(e) => {
              setHomePlayers({});
              setAwayPlayers({});
              setFormation(e.target.value as FormationKey);
            }}
            className="w-full appearance-none bg-transparent px-4 py-3 pr-10 text-white font-black text-[10px] uppercase outline-none cursor-pointer"
          >
            {Object.keys(FORMATIONS).map((f) => (
              <option key={f} value={f} className="bg-slate-900">
                FORM: {f}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Filter className="w-3 h-3 text-white/40" />
          </div>
        </div>

        {/* Limpar */}
        <button
          onClick={() => setCurrentSelectedState({})}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border border-white/10 transition-all active:scale-95"
        >
          <RefreshCcw className="w-3 h-3 opacity-60" />
          Limpar
        </button>
      </div>

      {/* Seletor de Time e Compartilhar */}
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 flex-1">
          <button
            onClick={() => setActiveTeam('home')}
            className={`flex-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              activeTeam === 'home' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Cruzeiro
          </button>
          <button
            onClick={() => setActiveTeam('away')}
            className={`flex-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              activeTeam === 'away' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Adversário
          </button>
        </div>

        <button
          onClick={handleShare}
          disabled={sharing || !isTeamComplete}
          className={`flex-[0.6] flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl border transition-all active:scale-95 ${isTeamComplete && !sharing
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40'
            : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
            }`}
        >
          {sharing ? (
            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
          ) : (
            <>
              <Share2 size={14} className={!isTeamComplete ? 'opacity-20' : ''} />
              {isTeamComplete ? 'Compartilhar' : 'Escalar 11'}
            </>
          )}
        </button>
      </div>

      {/* CAMPO — printado pelo html-to-image */}
      <div
        ref={pitchRef}
        className="w-full bg-[#030712] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10 flex flex-col relative"
      >
        {/* Banner superior */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md py-3 px-4 z-30 flex flex-col items-center border-b border-white/5 relative">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
          
          <div className="flex items-center justify-between w-full gap-2">
            {/* Logo Cruzeiro */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full p-1 shadow-xl border-2 border-primary flex items-center justify-center ring-4 ring-blue-500/20">
                {!cruzeiroImgError ? (
                  <img
                    src="/logos/cruzeiro.png"
                    alt="Cruzeiro"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                    onError={() => setCruzeiroImgError(true)}
                  />
                ) : (
                  <span className="text-[10px] sm:text-xs font-black text-blue-700">CRU</span>
                )}
              </div>
            </div>

            {/* Título Centralizado e Responsivo */}
            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <div className="flex items-center gap-2 scale-75 sm:scale-100 mb-0.5">
                <div className="h-px w-4 bg-blue-500/50" />
                <span className="text-[8px] font-black italic text-blue-400 uppercase tracking-[0.2em]">Live Match</span>
                <div className="h-px w-4 bg-blue-500/50" />
              </div>
              
              <h2 className="text-[12px] sm:text-xl font-black italic uppercase tracking-tighter text-white text-center leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {activeTeam === 'home' ? 'Cruzeiro Esporte Clube' : `Elenco ${nextGame?.opponent || 'Adversário'}`}
              </h2>
              
              <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/10">
                <Trophy className="w-2 h-2 text-yellow-500" />
                <span className="text-[6px] sm:text-[8px] font-bold text-blue-200 uppercase tracking-widest truncate max-w-[120px]">
                  {nextGame?.competition || 'Temporada 2026'}
                </span>
              </div>
            </div>

            {/* Logo adversário */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-full p-1.5 shadow-xl border-2 border-white/20 flex items-center justify-center overflow-hidden ring-4 ring-white/10">
                {(() => {
                  const oppName = nextGame?.opponent;
                  const logoUrl = nextGame?.opponent_logo || (oppName ? getTeamLogo(oppName) : '');

                  if (logoUrl && !opponentImgError) {
                    return (
                      <img
                        src={logoUrl.startsWith('http')
                          ? `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl)}`
                          : logoUrl}
                        alt={oppName || 'Adversário'}
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        onError={() => setOpponentImgError(true)}
                      />
                    );
                  }
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-blue-900/40">
                      <span className="text-[10px] sm:text-lg font-black text-white/40">
                        {oppName ? getTeamInitials(oppName) : '?'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Gramado */}
        <div className="relative w-full aspect-[3/4]">
          {/* Fundo azul profundo estético */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, #0f172a 0%, #0f172a 50%, #1e293b 50%, #1e293b 100%)',
              backgroundSize: '100% 60px',
            }}
          />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent" />

          {/* Linhas do campo */}
          <div className="absolute inset-0 p-4 sm:p-6 pointer-events-none">
            <div className="w-full h-full border-2 border-white/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-white/40 rounded-full" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-20 sm:h-28 border-2 border-b-0 border-white/40 rounded-t-xl" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-20 sm:h-28 border-2 border-t-0 border-white/40 rounded-b-xl" />
            </div>
          </div>

          {/* Badge Instagram */}
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-30 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-2xl">
            <Instagram className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            <span className="text-white font-black text-[9px] sm:text-[11px] tracking-wide">@itallozk</span>
          </div>

          {/* Jogadores */}
          {FORMATIONS[formation].map((pos) => {
            const player = currentSelectedState[pos.id];
            return (
              <div
                key={pos.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
              >
                <div
                  onClick={() => {
                    setActiveSlot(pos.id);
                    setFilterPos(pos.role);
                  }}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  {/* Círculo do jogador */}
                  <div className={`
                    relative w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 sm:border-[3px]
                    ${player ? 'border-white bg-white shadow-2xl' : 'border-white/50 bg-white/20 hover:bg-white/40'}
                    flex items-center justify-center overflow-hidden transition-all
                  `}>
                    {player ? (
                      <img
                        src={
                          (player.photo_url || '').startsWith('http')
                            ? `https://images.weserv.nl/?url=${encodeURIComponent(player.photo_url || '')}`
                            : (player.photo_url || '')
                        }
                        alt={player.name || 'Jogador'}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0055ff&color=fff`;
                        }}
                      />
                    ) : (
                      <img
                        src={(activeTeam === 'home' ? "/logos/cruzeiro.png" : (nextGame?.opponent_logo || getTeamLogo(nextGame?.opponent || ''))) as string}
                        alt={pos.role}
                        className="w-full h-full object-contain opacity-40 group-hover:opacity-100 transition-opacity p-1.5"
                      />
                    )}
                  </div>

                  {/* Label do jogador */}
                  <div className={`
                    mt-1 w-[70px] h-[20px] rounded-lg shadow-xl border
                    ${player ? 'bg-white border-blue-600' : 'bg-blue-900/60 border-white/20'}
                    flex items-center justify-center
                  `}>
                    <span className={`font-black uppercase tracking-tighter italic text-[9px]
                      ${player ? 'text-blue-700' : 'text-white/80'}
                    `}>
                      {player ? player.name : pos.role}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download manual (desktop hint) */}
      {isTeamComplete && (
        <p className="text-white/30 text-[10px] text-center font-bold uppercase tracking-widest px-4">
          💡 No desktop, clique em Compartilhar para baixar a imagem e postar nas redes
        </p>
      )}

      {/* Modal de Seleção de Jogador */}
      <AnimatePresence>
        {activeSlot !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setActiveSlot(null); setSearchTerm(''); }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={(activeTeam === 'home' ? "/logos/cruzeiro.png" : (nextGame?.opponent_logo || getTeamLogo(nextGame?.opponent || ''))) as string} 
                      alt="Time" 
                      className="w-8 h-8 object-contain" 
                    />
                    <h3 className="text-lg sm:text-xl font-black text-gray-800 uppercase italic">
                      {activeTeam === 'home' ? 'Cruzeiro' : (nextGame?.opponent || 'Adversário')}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setActiveSlot(null); setSearchTerm(''); }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Busca */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar jogador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-2 sm:py-3 px-10 text-xs sm:text-sm font-bold text-gray-700 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    autoFocus
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

              {/* Grid de jogadores */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loadingOpponents ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Buscando Atletas...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {filteredPlayers.map((player: CruzeiroPlayer) => {
                      const isSelected = Object.values(currentSelectedState).some((p) => p?.id === player.id);
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
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-800 p-3">
                              <img src="/logos/cruzeiro.png" alt="Cruzeiro" className="w-full h-full object-contain opacity-50" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tighter text-center line-clamp-1">
                          {player.name}
                        </h4>
                      </button>
                    );
                  })}

                  {!loadingOpponents && filteredPlayers.length === 0 && (
                    <div className="col-span-2 py-20 text-center opacity-30">
                      <p className="text-sm font-black uppercase text-gray-500">Nenhum atleta</p>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModernPitchView;
