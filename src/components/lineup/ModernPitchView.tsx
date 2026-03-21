import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, 
  Trophy, 
  Search, 
  X, 
  UserPlus,
  Trash2,
  AlertCircle,
  Instagram
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../context/AuthContext';
import { getTeamLogo, getTeamInitials } from '../../utils/teamLogos';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';

interface TeamPlayer {
  id: string;
  name: string;
  position: string;
  number: string;
  photo_url: string | null;
  club_slug?: string;
  team_id?: number;
}

interface MatchGame {
  id: string;
  opponent: string;
  opponent_logo: string | null;
  date: string;
  competition: string;
  is_home: boolean;
  club_slug: string;
  club_logo?: string;
  api_home_team_id?: number;
  api_away_team_id?: number;
}

interface FormationPosition {
  id: number;
  role: string;
  top: number;
  left: number;
}

const FORMATIONS: Record<string, FormationPosition[]> = {
  '4-4-2': [
    { id: 1, role: 'GOL', top: 92, left: 50 },
    { id: 2, role: 'LAT', top: 78, left: 15 },
    { id: 3, role: 'ZAG', top: 82, left: 35 },
    { id: 4, role: 'ZAG', top: 82, left: 65 },
    { id: 5, role: 'LAT', top: 78, left: 85 },
    { id: 6, role: 'MEI', top: 58, left: 18 },
    { id: 7, role: 'MEI', top: 62, left: 40 },
    { id: 8, role: 'MEI', top: 62, left: 60 },
    { id: 9, role: 'MEI', top: 58, left: 82 },
    { id: 10, role: 'ATA', top: 32, left: 35 },
    { id: 11, role: 'ATA', top: 32, left: 65 },
  ],
  '4-3-3': [
    { id: 1, role: 'GOL', top: 92, left: 50 },
    { id: 2, role: 'LAT', top: 78, left: 15 },
    { id: 3, role: 'ZAG', top: 82, left: 35 },
    { id: 4, role: 'ZAG', top: 82, left: 65 },
    { id: 5, role: 'LAT', top: 78, left: 85 },
    { id: 6, role: 'MEI', top: 54, left: 50 },
    { id: 7, role: 'MEI', top: 64, left: 25 },
    { id: 8, role: 'MEI', top: 64, left: 75 },
    { id: 9, role: 'ATA', top: 34, left: 15 },
    { id: 10, role: 'ATA', top: 25, left: 50 },
    { id: 11, role: 'ATA', top: 34, left: 85 },
  ],
  '3-5-2': [
    { id: 1, role: 'GOL', top: 92, left: 50 },
    { id: 2, role: 'ZAG', top: 82, left: 25 },
    { id: 3, role: 'ZAG', top: 82, left: 50 },
    { id: 4, role: 'ZAG', top: 82, left: 75 },
    { id: 5, role: 'LAT', top: 62, left: 15 },
    { id: 6, role: 'MEI', top: 62, left: 35 },
    { id: 7, role: 'MEI', top: 54, left: 50 },
    { id: 8, role: 'MEI', top: 62, left: 65 },
    { id: 9, role: 'LAT', top: 62, left: 85 },
    { id: 10, role: 'ATA', top: 32, left: 35 },
    { id: 11, role: 'ATA', top: 32, left: 65 },
  ]
};

import { useData } from '../../context/DataContext';

const ModernPitchView: React.FC = () => {
  const { currentUser, guestClub } = useData();
  const [formation, setFormation] = useState('4-4-2');
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState<string>('');
  
  const [homeSelected, setHomeSelected] = useState<Record<number, TeamPlayer>>({});
  const [awaySelected, setAwaySelected] = useState<Record<number, TeamPlayer>>({});
  
  const [availablePlayers, setAvailablePlayers] = useState<TeamPlayer[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [nextGame, setNextGame] = useState<MatchGame | null>(null);
  const [clubInfo, setClubInfo] = useState<{name: string, logo_url: string | null, brand_color: string} | null>(null);

  const [cruzeiroImgError, setCruzeiroImgError] = useState(false);
  const [opponentImgError, setOpponentImgError] = useState(false);
  const [liveFormation, setLiveFormation] = useState<FormationPosition[] | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const pitchRef = useRef<HTMLDivElement>(null);

  const clubSlug = currentUser?.club_slug || guestClub || 'cruzeiro';

  useEffect(() => {
    loadData();
  }, [clubSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: clubData } = await supabase
        .from('clubs_config')
        .select('name, logo_url, brand_color')
        .eq('slug', clubSlug)
        .maybeSingle();
      
      if (clubData) {
        setClubInfo(clubData);
        setCruzeiroImgError(false); // Reset error state on data load
      }

      // Buscar jogos com status 'live' primeiro, depois 'upcoming'
      const { data: liveGameData } = await supabase
        .from('match_games')
        .select('*')
        .eq('club_slug', clubSlug)
        .eq('status', 'live')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      const gameData = liveGameData || (await supabase
        .from('match_games')
        .select('*')
        .eq('club_slug', clubSlug)
        .eq('status', 'upcoming')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()).data;
      
      if (gameData) {
        setNextGame(gameData);
        setOpponentImgError(false);
        
        const oppTeamId = gameData.is_home ? gameData.api_away_team_id : gameData.api_home_team_id;
        if (oppTeamId) {
          // 1. Tentar buscar do banco
          const { data: oppPlayers } = await supabase
            .from('opponent_players')
            .select('*')
            .eq('team_id', oppTeamId)
            .order('name', { ascending: true });
          
          if (oppPlayers && oppPlayers.length > 0) {
            setOpponentPlayers(oppPlayers as TeamPlayer[]);
            console.log(`✅ ${oppPlayers.length} jogadores do adversário carregados do banco.`);
          } else {
            // 2. Fallback: buscar da API Football e salvar no banco
            try {
              const apiKey = import.meta.env.VITE_FOOTBALL_API_KEY;
              if (apiKey) {
                console.log(`🔄 Buscando elenco do adversário (ID: ${oppTeamId}) na API Football...`);
                const response = await fetch(`https://v3.football.api-sports.io/players/squads?team=${oppTeamId}`, {
                  headers: {
                    'x-apisports-key': apiKey,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                  }
                });
                const result = await response.json();
                
                if (result.response && result.response.length > 0) {
                  const squad = result.response[0].players;
                  const posMap: Record<string, string> = {
                    'Goalkeeper': 'GOL', 'Defender': 'ZAG,LAT', 'Midfielder': 'MEI', 'Attacker': 'ATA'
                  };
                  
                  const playersToInsert = squad.map((p: any) => ({
                    name: p.name,
                    full_name: p.name,
                    photo_url: p.photo,
                    position: posMap[p.position] || 'MEI',
                    number: String(p.number || 0),
                    team_id: oppTeamId,
                    is_active: true,
                  }));
                  
                  // Salvar no banco para cache futuro
                  const { error: insertError } = await supabase.from('opponent_players').insert(playersToInsert);
                  
                  if (!insertError) {
                    setOpponentPlayers(playersToInsert as TeamPlayer[]);
                    console.log(`✅ ${playersToInsert.length} jogadores do adversário importados com sucesso.`);
                  } else {
                    console.error('❌ Erro ao salvar jogadores do adversário:', insertError);
                    // Mesmo com erro ao salvar, mostramos na UI
                    setOpponentPlayers(playersToInsert as TeamPlayer[]);
                  }
                }
              }
            } catch (apiErr) {
              console.warn('⚠️ Não foi possível buscar jogadores da API Football:', apiErr);
            }
          }
        }
      }

      const { data: playerData } = await supabase
        .from('team_players')
        .select('*')
        .eq('club_slug', clubSlug)
        .order('name', { ascending: true });
      
      if (playerData) setAvailablePlayers(playerData);
      
      // Buscar escalação real se o jogo for hoje ou estiver live
      if (gameData?.api_fixture_id) {
        const gameDate = new Date(gameData.date);
        const today = new Date();
        const isRecent = Math.abs(today.getTime() - gameDate.getTime()) < 24 * 60 * 60 * 1000;
        
        if (isRecent || gameData.status === 'live') {
          fetchLiveLineup(gameData.api_fixture_id, gameData.is_home);
        }
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da escalação');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveLineup = async (fixtureId: number, isHomeClient: boolean) => {
    try {
      const apiKey = import.meta.env.VITE_FOOTBALL_API_KEY;
      if (!apiKey) return;

      const response = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, {
        headers: {
          'x-apisports-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });
      const result = await response.json();

      if (result.response && result.response.length > 0) {
        // Encontrar o time correto no array (o cliente pode ser home ou away na API)
        // Busca flexível: 'atletico-mg' -> 'atletico', 'cruzeiro' -> 'cruzeiro'
        const searchKey = clubSlug.split('-')[0].toLowerCase();
        
        console.log(`[Lineup] Buscando time com chave: ${searchKey} no fixture ${fixtureId}`);
        
        const lineupData = result.response.find((l: any) => {
          const apiTeamName = l.team.name.toLowerCase();
          const isOurTeam = apiTeamName.includes(searchKey);
          return isHomeClient ? isOurTeam : !isOurTeam;
        }) || result.response[0];

        console.log(`[Lineup] Time identificado: ${lineupData.team.name}`);

        if (lineupData && lineupData.startXI) {
          const mappedLineup: FormationPosition[] = lineupData.startXI.map((item: any, idx: number) => {
            const [row, col] = (item.player.grid || "1:1").split(':').map(Number);
            
            // Mapeamento de Top % (Invertido pois 1 é GOL no fundo)
            const rowsTop: Record<number, number> = { 1: 92, 2: 78, 3: 58, 4: 34, 5: 18 };
            
            // Mapeamento de Left % (Distribuído)
            const leftMap: Record<number, number> = { 1: 15, 2: 35, 3: 50, 4: 65, 5: 85 };
            
            // Especial para Goleiro (sempre centro)
            if (row === 1) return { id: idx + 1, role: 'GOL', top: 92, left: 50, player: item.player };

            return {
              id: idx + 1,
              role: item.player.pos === 'G' ? 'GOL' : item.player.pos === 'D' ? 'DEF' : item.player.pos === 'M' ? 'MEI' : 'ATA',
              top: rowsTop[row] || 50,
              left: leftMap[col] || (col * 15 + 10),
              player: item.player
            };
          });

          setLiveFormation(mappedLineup);
          setIsLiveActive(true);
          
          // Se for live, já preencher os jogadores
          const selected: Record<number, TeamPlayer> = {};
          mappedLineup.forEach((pos: any) => {
            selected[pos.id] = {
              id: String(pos.player.id),
              name: pos.player.name,
              number: String(pos.player.number),
              position: pos.role,
              photo_url: `https://media.api-sports.io/football/players/${pos.player.id}.png`
            };
          });
          
          if (activeTeam === 'home') setHomeSelected(selected);
          else setAwaySelected(selected);
          
          toast.success("Escalação real carregada!", { icon: '🔥' });
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar escalação live:", e);
    }
  };

  const syncTeamPlayers = async () => {
    if (!currentUser?.is_admin) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('sync-team-players', {
        body: { club_slug: clubSlug }
      });
      
      if (error) throw error;
      
      toast.success(data.message || "Elenco sincronizado!");
      loadData(); // Recarregar jogadores
    } catch (error: any) {
      console.error('Erro detalhado ao sincronizar:', error);
      
      let errorMsg = error.message || 'Erro desconhecido';
      
      // Tentar extrair a mensagem de erro do corpo da resposta da Edge Function
      if (error.context && typeof error.context.json === 'function') {
        try {
          const body = await error.context.json();
          if (body.error) errorMsg = body.error;
        } catch (e) {
          console.warn('Não foi possível ler o corpo do erro:', e);
        }
      }

      const isCorsError = error.message?.includes('failed to fetch') || error.message?.includes('CORS');
      const msg = isCorsError 
        ? 'Erro de Conexão (CORS/Deploy)! Verifique se a função está ativa.'
        : 'Erro na Sincronização: ' + errorMsg;
      
      toast.error(msg, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const getPlayerPhoto = (player: TeamPlayer) => {
    if (!player.photo_url) return null;
    // Usar proxy weserv.nl para evitar problemas de CORS e redimensionar
    return `https://images.weserv.nl/?url=${encodeURIComponent(player.photo_url)}&w=100&h=100&fit=cover&mask=circle`;
  };

  const currentSelectedState = activeTeam === 'home' ? homeSelected : awaySelected;
  const setTeamSelected = activeTeam === 'home' ? setHomeSelected : setAwaySelected;

  const handleSelectPlayer = (player: TeamPlayer) => {
    if (activeSlot === null) return;
    setTeamSelected(prev => ({ ...prev, [activeSlot]: player }));
    setActiveSlot(null);
    setSearchTerm('');
    toast.success(`${player.name} escalado!`);
  };

  const handleShare = async () => {
    if (!pitchRef.current) return;
    try {
      setSharing(true);
      
      const dataUrl = await toPng(pitchRef.current, {
        cacheBust: true,
        backgroundColor: '#030712',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `escalacao-${activeTeam === 'home' ? (clubSlug || 'meu-time') : 'adversario'}.png`;
      link.click();
      
      toast.success('Imagem gerada com sucesso!', {
        icon: '📸',
        style: {
          borderRadius: '1rem',
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold',
        }
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar imagem');
    } finally {
      setSharing(false);
    }
  };

  const currentRoster = activeTeam === 'home' ? availablePlayers : opponentPlayers;

  const filteredPlayers = currentRoster.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Se não há filtro, mostra todos que batem com a busca
    if (!filterPos) return matchesSearch;
    
    // Filtro flexível para posições
    const playerPos = p.position.toUpperCase();
    const targetPos = filterPos.toUpperCase();
    
    const matchesPos = playerPos.includes(targetPos) || targetPos.includes(playerPos);
    
    return matchesSearch && matchesPos;
  });

  const isTeamComplete = Object.keys(currentSelectedState).length === 11;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-blue-200/40 text-sm font-black uppercase tracking-widest animate-pulse">Carregando Elenco...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <select 
            value={formation}
            onChange={(e) => {
              setFormation(e.target.value);
              setHomeSelected({});
              setAwaySelected({});
            }}
            className="bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-tighter px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-w-[100px]"
          >
            {Object.keys(FORMATIONS).map(f => (
              <option key={f} value={f} className="bg-slate-900">FORM: {f}</option>
            ))}
          </select>

          {isLiveActive && (
             <button
              onClick={() => {
                setLiveFormation(null);
                setIsLiveActive(false);
                setHomeSelected({});
                setAwaySelected({});
              }}
              className="px-4 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="text-[10px] font-black uppercase italic tracking-tight">Usar Padrão</span>
            </button>
          )}

          {currentUser?.is_admin && (
            <button
              onClick={syncTeamPlayers}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-xl transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <UserPlus className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-black uppercase italic tracking-tight">Sincronizar API</span>
            </button>
          )}

          <button
            onClick={() => setTeamSelected({})}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 rounded-xl transition-all active:scale-95 flex items-center gap-2 group"
          >
            <Trash2 size={14} className="group-hover:text-red-500" />
            <span className="text-[10px] font-black uppercase italic tracking-tight">Limpar</span>
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => { setActiveTeam('home'); setSearchTerm(''); }}
            className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTeam === 'home' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            {clubInfo?.name || (currentUser?.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG')}
          </button>
          <button
            onClick={() => { setActiveTeam('away'); setSearchTerm(''); }}
            className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTeam === 'away' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            Adversário
          </button>
          
          {activeTeam === 'away' && currentUser?.is_admin && (
            <button
              onClick={async () => {
                if (!nextGame) return;
                const oppTeamId = nextGame.is_home ? nextGame.api_away_team_id : nextGame.api_home_team_id;
                if (!oppTeamId) return;
                
                try {
                  setLoading(true);
                  // Limpar do banco primeiro
                  await supabase.from('opponent_players').delete().eq('team_id', oppTeamId);
                  // Forçar reload
                  await loadData();
                  toast.success('Elenco do adversário atualizado!');
                } catch (err) {
                  toast.error('Erro ao atualizar elenco');
                } finally {
                  setLoading(false);
                }
              }}
              title="Recarregar do zero via API"
              className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl border border-white/10 transition-all active:rotate-180"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
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

      <div
        ref={pitchRef}
        className="w-full md:max-w-2xl md:mx-auto bg-[#030712] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10 flex flex-col relative"
      >
        <div className="w-full bg-slate-900/90 backdrop-blur-md py-4 px-6 z-30 flex flex-col items-center border-b border-white/5 relative">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
          
          <div className="flex items-center justify-between w-full gap-4">
              <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center overflow-visible">
                {(() => {
                  const logoUrl = clubInfo?.logo_url;
                  if (logoUrl && !cruzeiroImgError) {
                    const proxiedUrl = logoUrl.startsWith('http') 
                      ? `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl)}&w=250&h=250&fit=contain`
                      : logoUrl;
                    return (
                      <img
                        src={proxiedUrl}
                        alt={clubInfo?.name || 'Clube'}
                        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                        crossOrigin="anonymous"
                        onError={() => setCruzeiroImgError(true)}
                      />
                    );
                  }
                  return (
                    <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center">
                       <span className="text-xs sm:text-lg font-black text-white">
                        {clubInfo?.name?.substring(0, 3).toUpperCase() || 'ZK'}
                      </span>
                    </div>
                  );
                })()}
              </div>

            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-px w-6 bg-blue-500/50" />
                <span className="text-[10px] font-black italic text-blue-400 uppercase tracking-[0.3em]">Live Match</span>
                <div className="h-px w-6 bg-blue-500/50" />
              </div>
              
              <h2 className="text-lg sm:text-2xl font-black italic uppercase tracking-tighter text-white text-center leading-none drop-shadow-2xl">
                {activeTeam === 'home' ? (clubInfo?.name || (currentUser?.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG')) : (nextGame?.opponent || 'Adversário')}
              </h2>
              
              <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="text-[8px] sm:text-[10px] font-black text-blue-200 uppercase tracking-widest truncate">
                  {nextGame?.competition || 'Temporada 2026'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
               <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center overflow-visible">
                {(() => {
                  const oppName = nextGame?.opponent;
                  const logoUrl = nextGame?.opponent_logo || (oppName ? getTeamLogo(oppName) : '');

                  if (logoUrl && !opponentImgError) {
                    return (
                      <img
                        src={logoUrl.startsWith('http')
                          ? `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl)}&w=250&h=250&fit=contain`
                          : logoUrl}
                        alt={oppName || 'Adversário'}
                        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                        crossOrigin="anonymous"
                        onError={() => setOpponentImgError(true)}
                      />
                    );
                  }
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-white/10 rounded-full">
                      <span className="text-xs sm:text-lg font-black text-white/40">
                        {oppName ? getTeamInitials(oppName) : '?'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full aspect-[4/5]">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, #0f172a 0%, #0f172a 50%, #1e293b 50%, #1e293b 100%)',
              backgroundSize: '100% 80px',
            }}
          />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent" />

          <div className="absolute inset-0 p-6 pointer-events-none">
            <div className="w-full h-full border-2 border-white/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-24 sm:h-32 border-2 border-b-0 border-white/40 rounded-t-xl" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-24 sm:h-32 border-2 border-t-0 border-white/40 rounded-b-xl" />
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-2xl">
            <Instagram className="w-3 h-3 text-white" />
            <span className="text-white font-black text-[10px] sm:text-[12px] tracking-wide">@itallozk</span>
          </div>

          {(isLiveActive ? (liveFormation || []) : FORMATIONS[formation]).map((pos: any) => {
            const player = currentSelectedState[pos.id];
            return (
              <div
                key={pos.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-700"
                style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
              >
                <div
                  onClick={() => {
                    setActiveSlot(pos.id);
                    setFilterPos(pos.role);
                  }}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className={`
                    relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-[3px]
                    ${player ? 'border-white bg-white shadow-2xl' : 'border-white/50 bg-white/20 hover:bg-white/40'}
                    flex items-center justify-center overflow-hidden transition-all
                  `}>
                    {player ? (
                      <img
                        src={getPlayerPhoto(player) || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0055ff&color=fff`}
                        alt={player.name || 'Jogador'}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0055ff&color=fff`;
                        }}
                      />
                    ) : (
                      (() => {
                        const rawLogoUrl = (activeTeam === 'home' 
                          ? clubInfo?.logo_url 
                          : (nextGame?.opponent_logo || getTeamLogo(nextGame?.opponent || ''))) as string;
                        
                        const proxiedLogoUrl = (rawLogoUrl && rawLogoUrl.startsWith('http'))
                          ? `https://images.weserv.nl/?url=${encodeURIComponent(rawLogoUrl)}&w=150&h=150&fit=contain`
                          : rawLogoUrl;

                        if (!proxiedLogoUrl) return null;

                        return (
                          <img
                            src={proxiedLogoUrl}
                            alt={pos.role}
                            className={`w-full h-full object-contain transition-opacity p-2 ${activeTeam === 'home' ? 'opacity-80' : 'opacity-40 group-hover:opacity-100'}`}
                          />
                        );
                      })()
                    )}
                  </div>

                  <div className={`
                    mt-1 sm:mt-1.5 min-w-[50px] sm:min-w-[70px] max-w-[85px] sm:max-w-[130px] w-fit px-1.5 sm:px-3 h-[18px] sm:h-[24px] rounded-lg shadow-xl border
                    ${player ? 'bg-white border-blue-600' : 'bg-blue-900/60 border-white/20'}
                    flex items-center justify-center
                  `}>
                    <span className={`font-black uppercase tracking-tighter italic truncate w-full text-center
                      ${(player ? player.name : pos.role).length > 12 ? 'text-[7.5px] sm:text-[9px]' : 'text-[9px] sm:text-[10px]'}
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
              <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const rawLogoUrl = (activeTeam === 'home' 
                        ? clubInfo?.logo_url 
                        : (nextGame?.opponent_logo || getTeamLogo(nextGame?.opponent || ''))) as string;
                      
                      const proxiedLogoUrl = (rawLogoUrl && rawLogoUrl.startsWith('http'))
                        ? `https://images.weserv.nl/?url=${encodeURIComponent(rawLogoUrl)}&w=100&h=100&fit=contain`
                        : rawLogoUrl;

                      if (!proxiedLogoUrl) return null;

                      return (
                        <img 
                          src={proxiedLogoUrl} 
                          alt="Time" 
                          className="w-8 h-8 object-contain" 
                        />
                      );
                    })()}
                    <h3 className="text-lg sm:text-xl font-black text-gray-800 uppercase italic">
                      {activeTeam === 'home' ? (clubInfo?.name || (currentUser?.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG')) : (nextGame?.opponent || 'Adversário')}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setActiveSlot(null); setSearchTerm(''); }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar jogador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-0.5">
                  {['', 'GOL', 'DEF', 'MEI', 'ATA'].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setFilterPos(pos)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all whitespace-nowrap ${
                        filterPos === pos
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {pos || 'TODOS'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => {
                    const isSelected = Object.values(currentSelectedState).some(p => p.id === player.id);
                    return (
                      <button
                        key={player.id}
                        disabled={isSelected}
                        onClick={() => handleSelectPlayer(player)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-gray-50 border-gray-100 opacity-50' 
                            : 'bg-white border-gray-100 hover:border-blue-500 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                            {player.photo_url ? (
                              <img
                                src={player.photo_url.startsWith('http')
                                  ? `https://images.weserv.nl/?url=${encodeURIComponent(player.photo_url)}`
                                  : player.photo_url}
                                alt={player.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">
                                {player.name.substring(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-black text-gray-800 uppercase italic tracking-tighter text-sm sm:text-base">
                              {player.name}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              #{player.number} • {player.position}
                            </p>
                          </div>
                        </div>
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-gray-100' : 'bg-blue-50'}`}>
                          {isSelected ? (
                            <AlertCircle className="w-4 h-4 text-gray-300" />
                          ) : (
                            <UserPlus className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-bold text-sm uppercase tracking-widest opacity-40">Nenhum jogador encontrado</p>
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
