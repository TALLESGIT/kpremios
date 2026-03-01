import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getYouTubeThumbnail } from '../../utils/youtube';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';
import { toast } from 'react-hot-toast';
import {
    Tv,
    Calendar,
    Trophy,
    Plus,
    Trash2,
    Edit2,
    Info,
    ChevronLeft,
    Upload,
    Loader2,
    Zap,
    MapPin,
    Users
} from 'lucide-react';
import Header from '../../components/shared/Header';
import Footer from '../../components/shared/Footer';
import TeamLogo from '../../components/TeamLogo';
import { CruzeiroGame, CruzeiroStanding, YouTubeClip, CruzeiroPlayer } from '../../types';
import { useMemo } from 'react';
import { getTeamColors } from '../../utils/teamLogos';

const COMPETITIONS = [
    'Campeonato Brasileiro - Série A',
    'Copa Conmebol Libertadores',
    'Copa do Brasil',
    'Campeonato Mineiro',
    'Copa Conmebol Sul-Americana',
    'Amistoso'
];

const TEAMS_LIBERTADORES = [
    'River Plate', 'Boca Juniors', 'Racing', 'Independiente', 'Estudiantes', 'Talleres',
    'Peñarol', 'Nacional', 'Millonarios', 'Atlético Nacional', 'Colo-Colo',
    'Independiente del Valle', 'LDU Quito', 'Olimpia', 'Cerro Porteño', 'Bolívar', 'The Strongest'
];

const TEAMS_BRASIL_SERIE_A = [
    'Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Internacional', 'Grêmio',
    'Bahia', 'Fortaleza', 'Fluminense', 'Vasco', 'Botafogo', 'Red Bull Bragantino',
    'Athletico-PR', 'Cuiabá', 'Juventude', 'Vitória', 'Criciúma', 'Atlético-GO'
];

const TEAMS_MINEIRO = [
    'Atlético-MG', 'América-MG', 'Athletic Club', 'Villa Nova', 'Pouso Alegre',
    'Tombense', 'Ipatinga', 'Uberlândia', 'Democrata-GV', 'Itabirito'
];

const TEAMS_BY_COMPETITION: Record<string, string[]> = {
    'Campeonato Brasileiro - Série A': TEAMS_BRASIL_SERIE_A,
    'Copa Conmebol Libertadores': [...TEAMS_LIBERTADORES, 'Flamengo', 'Palmeiras', 'São Paulo', 'Botafogo', 'Fortaleza'],
    'Copa Conmebol Sul-Americana': [...TEAMS_LIBERTADORES, 'Corinthians', 'Internacional', 'Athletico-PR'],
    'Campeonato Mineiro': TEAMS_MINEIRO,
    'Copa do Brasil': [...TEAMS_BRASIL_SERIE_A, ...TEAMS_MINEIRO],
    'Amistoso': [...TEAMS_BRASIL_SERIE_A, ...TEAMS_MINEIRO, ...TEAMS_LIBERTADORES]
};

const ALL_OPPONENTS = [...new Set([...TEAMS_BRASIL_SERIE_A, ...TEAMS_MINEIRO, ...TEAMS_LIBERTADORES])].sort();

// Função helper para converter datetime-local para ISO preservando o horário local
const datetimeLocalToISO = (datetimeLocal: string): string => {
    if (!datetimeLocal) return '';
    // datetime-local vem no formato "YYYY-MM-DDTHH:mm"
    // Precisamos criar uma data preservando o horário local (sem aplicar timezone)
    const [datePart, timePart] = datetimeLocal.split('T');
    if (!datePart || !timePart) return datetimeLocal;

    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Criar data usando os componentes locais (sem timezone)
    // Isso garante que o horário selecionado seja preservado
    const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return localDate.toISOString();
};

// Função helper para converter ISO para datetime-local (formato esperado pelo input)
const isoToDatetimeLocal = (isoString: string | undefined): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        // Obter componentes da data no timezone local
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        return '';
    }
};

const AdminZkTVPage: React.FC = () => {
    const { currentUser } = useData();
    const [activeTab, setActiveTab] = useState<'games' | 'standings' | 'clips' | 'squad'>('games');
    const [loading, setLoading] = useState(true);
    const [bannerUploading, setBannerUploading] = useState(false);
    const [playerPhotoUploading, setPlayerPhotoUploading] = useState(false);

    // Clipes Inéditos
    const [clips, setClips] = useState<YouTubeClip[]>([]);
    const [isAddingClip, setIsAddingClip] = useState(false);
    const [editingClip, setEditingClip] = useState<YouTubeClip | null>(null);
    const [clipForm, setClipForm] = useState<Partial<YouTubeClip>>({
        title: '',
        youtube_url: '',
        description: '',
        is_active: true,
        category: 'Clipes'
    });
    const [saving, setSaving] = useState(false);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkStandings, setBulkStandings] = useState<CruzeiroStanding[]>([]);

    // Games State
    const [games, setGames] = useState<CruzeiroGame[]>([]);
    const [isAddingGame, setIsAddingGame] = useState(false);
    const [editingGame, setEditingGame] = useState<CruzeiroGame | null>(null);
    const [gameForm, setGameForm] = useState<Partial<CruzeiroGame>>({
        opponent: '',
        opponent_logo: '',
        date: new Date().toISOString(),
        venue: '',
        competition: '',
        is_home: true,
        banner_url: '',
        status: 'upcoming',
        score_home: 0,
        score_away: 0
    });

    // Players State
    const [players, setPlayers] = useState<CruzeiroPlayer[]>([]);
    const [isAddingPlayer, setIsAddingPlayer] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<CruzeiroPlayer | null>(null);
    const [playerForm, setPlayerForm] = useState<Partial<CruzeiroPlayer>>({
        name: '',
        full_name: '',
        photo_url: '',
        position: 'MEI',
        number: 0,
        is_active: true
    });

    // Obter lista filtrada de adversários com base na competição selecionada
    const filteredOpponents = useMemo(() => {
        if (!gameForm.competition || !TEAMS_BY_COMPETITION[gameForm.competition]) {
            return ALL_OPPONENTS;
        }
        return [...TEAMS_BY_COMPETITION[gameForm.competition]].sort();
    }, [gameForm.competition]);

    // Standings State
    const [standings, setStandings] = useState<CruzeiroStanding[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<string>('Campeonato Brasileiro - Série A');
    const [isAddingStanding, setIsAddingStanding] = useState(false);
    const [editingStanding, setEditingStanding] = useState<CruzeiroStanding | null>(null);
    const [standingForm, setStandingForm] = useState<Partial<CruzeiroStanding>>({
        team: '',
        position: 0,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        is_cruzeiro: false,
        competition: 'Campeonato Brasileiro - Série A',
        last_5: '',
        prev_position: 0,
        next_opponent: ''
    });

    useEffect(() => {
        if (currentUser?.is_admin) {
            loadData();
        }
    }, [currentUser]);

    // Recarregar standings quando mudar competição
    useEffect(() => {
        if (currentUser?.is_admin) {
            loadStandingsByCompetition();
        }
    }, [selectedCompetition, currentUser]);

    const loadStandingsByCompetition = async () => {
        try {
            const { data, error } = await supabase
                .from('cruzeiro_standings')
                .select('*')
                .eq('competition', selectedCompetition)
                .order('position', { ascending: true });

            if (!error && data) {
                setStandings(data);
            }
        } catch (err) {
            console.error('Erro ao carregar tabela:', err);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);

            await Promise.all([
                loadGames(),
                loadStandingsByCompetition(),
                loadClips(),
                loadPlayers()
            ]);

        } catch (error) {
            console.error('Error loading ZK TV data:', error);
            toast.error('Erro ao carregar dados da ZK TV');
        } finally {
            setLoading(false);
        }
    };

    const loadGames = async () => {
        const { data: gamesData } = await supabase
            .from('cruzeiro_games')
            .select('*')
            .order('date', { ascending: true });

        if (gamesData) setGames(gamesData);
    };

    const loadClips = async () => {
        const { data, error } = await supabase
            .from('youtube_clips')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Erro ao carregar clipes');
        } else {
            setClips(data || []);
        }
    };

    const loadPlayers = async () => {
        const { data, error } = await supabase
            .from('cruzeiro_players')
            .select('*')
            .order('position', { ascending: true })
            .order('name', { ascending: true });

        if (!error && data) {
            setPlayers(data);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'logo' | 'player' = 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 5MB');
            return;
        }

        try {
            if (type === 'banner') setBannerUploading(true);
            if (type === 'player') setPlayerPhotoUploading(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

            let folder = 'game_banners';
            let bucket = 'banners';

            if (type === 'logo') {
                folder = 'team_logos';
                bucket = 'banners';
            } else if (type === 'player') {
                folder = 'players'; // Pasta dentro do bucket 'players' ou apenas na raiz se preferir
                bucket = 'players';
            }

            const filePath = `${folder}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            if (type === 'banner') {
                setGameForm({ ...gameForm, banner_url: publicUrl });
            } else if (type === 'logo') {
                setGameForm({ ...gameForm, opponent_logo: publicUrl });
            } else if (type === 'player') {
                setPlayerForm({ ...playerForm, photo_url: publicUrl });
            }

            toast.success('Upload realizado com sucesso!');
        } catch (error: any) {
            console.error('Error uploading file:', error);
            toast.error('Erro ao fazer upload da imagem');
        } finally {
            setBannerUploading(false);
            setPlayerPhotoUploading(false);
        }
    };

    const handleSavePlayer = async () => {
        try {
            setSaving(true);
            if (!playerForm.name) {
                toast.error('Nome do jogador é obrigatório');
                return;
            }

            const payload = {
                ...playerForm,
                updated_at: new Date().toISOString()
            };

            const { error } = editingPlayer
                ? await supabase.from('cruzeiro_players').update(payload).eq('id', editingPlayer.id)
                : await supabase.from('cruzeiro_players').insert([payload]);

            if (error) throw error;
            toast.success(editingPlayer ? 'Jogador atualizado!' : 'Jogador adicionado!');
            setIsAddingPlayer(false);
            setEditingPlayer(null);
            setPlayerForm({
                name: '',
                full_name: '',
                photo_url: '',
                position: 'MEI',
                number: 0,
                is_active: true
            });
            loadPlayers();
        } catch (error) {
            console.error('Error saving player:', error);
            toast.error('Erro ao salvar jogador');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlayer = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este jogador?')) return;
        try {
            const { error } = await supabase.from('cruzeiro_players').delete().eq('id', id);
            if (error) throw error;
            toast.success('Jogador excluído!');
            loadPlayers();
        } catch (error) {
            toast.error('Erro ao excluir jogador');
        }
    };

    const handleSaveGame = async () => {
        try {
            setSaving(true);
            const payload = {
                ...gameForm,
                updated_at: new Date().toISOString()
            };

            const { error } = editingGame
                ? await supabase.from('cruzeiro_games').update(payload).eq('id', editingGame.id)
                : await supabase.from('cruzeiro_games').insert([payload]);

            if (error) throw error;
            toast.success(editingGame ? 'Jogo atualizado!' : 'Jogo adicionado!');
            setIsAddingGame(false);
            setEditingGame(null);
            loadData();
        } catch (error) {
            console.error('Error saving game:', error);
            toast.error('Erro ao salvar jogo');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGame = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este jogo?')) return;
        try {
            const { error } = await supabase.from('cruzeiro_games').delete().eq('id', id);
            if (error) throw error;
            toast.success('Jogo excluído!');
            loadData();
        } catch (error) {
            toast.error('Erro ao excluir jogo');
        }
    };

    const handleSaveStanding = async () => {
        try {
            setSaving(true);

            // Validações
            if (!standingForm.team || standingForm.team.trim() === '') {
                toast.error('Nome do time é obrigatório');
                return;
            }

            if (!standingForm.position || standingForm.position < 1) {
                toast.error('Posição deve ser maior que zero');
                return;
            }

            const payload = {
                ...standingForm,
                competition: standingForm.competition || selectedCompetition,
                team: standingForm.team.trim()
            };

            const { error } = editingStanding
                ? await supabase.from('cruzeiro_standings').update(payload).eq('id', editingStanding.id)
                : await supabase.from('cruzeiro_standings').insert([payload]);

            if (error) {
                console.error('Erro detalhado ao salvar classificação:', error);
                toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
                return;
            }

            toast.success('Classificação atualizada!');
            setIsAddingStanding(false);
            setEditingStanding(null);
            setStandingForm({
                team: '',
                position: 0,
                points: 0,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goals_for: 0,
                goals_against: 0,
                is_cruzeiro: false,
                competition: selectedCompetition,
                last_5: '',
                prev_position: 0,
                next_opponent: ''
            });
            loadStandingsByCompetition();
        } catch (error: any) {
            console.error('Erro ao salvar classificação:', error);
            toast.error(`Erro ao salvar classificação: ${error?.message || 'Erro desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBulkStandings = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('cruzeiro_standings').upsert(bulkStandings);
            if (error) throw error;
            toast.success('Todas as classificações foram atualizadas!');
            setIsBulkEditing(false);
            loadStandingsByCompetition();
        } catch (error: any) {
            console.error('Erro ao salvar em massa:', error);
            toast.error('Erro ao atualizar tabela');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStanding = async (id: string) => {
        if (!window.confirm('Excluir este time da tabela?')) return;
        try {
            const { error } = await supabase.from('cruzeiro_standings').delete().eq('id', id);
            if (error) throw error;
            toast.success('Time removido!');
            loadStandingsByCompetition();
        } catch (error) {
            toast.error('Erro ao remover time');
        }
    };

    // YouTube Clips Handlers
    const handleSaveClip = async () => {
        if (!clipForm.title || !clipForm.youtube_url) {
            toast.error('Preencha pelo menos o título e a URL do YouTube');
            return;
        }

        // Robust extraction for various YouTube URL formats
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = clipForm.youtube_url.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;

        if (!videoId) {
            toast.error('URL do YouTube inválida ou ID do vídeo não encontrado');
            return;
        }

        const thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        const payload = {
            ...clipForm,
            thumbnail_url,
            youtube_url: videoId,
            updated_at: new Date().toISOString()
        };

        try {
            setSaving(true);
            if (editingClip) {
                const { error } = await supabase
                    .from('youtube_clips')
                    .update(payload)
                    .eq('id', editingClip.id);

                if (error) throw error;
                toast.success('Clipe atualizado');
            } else {
                const { data: insertedClip, error } = await supabase
                    .from('youtube_clips')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;

                // Enviar push notification para os usuários
                try {
                    await supabase.functions.invoke('notify-music-added', {
                        body: { record: { id: insertedClip.id, title: clipForm.title }, type: 'INSERT', content_type: 'clip' }
                    });
                    toast.success('Clipe adicionado e usuários notificados!');
                } catch (notifyErr) {
                    console.error('Erro ao notificar usuários:', notifyErr);
                    toast.success('Clipe adicionado (falha ao notificar)');
                }
            }
            setIsAddingClip(false);
            setEditingClip(null);
            loadClips();
        } catch (error: any) {
            toast.error('Erro ao salvar clipe: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClip = async (id: string) => {
        if (!window.confirm('Excluir este clipe?')) return;

        const { error } = await supabase
            .from('youtube_clips')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Erro ao excluir');
        } else {
            toast.success('Clipe excluído');
            loadClips();
        }
    };

    if (!currentUser?.is_admin) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
                <div className="text-center">
                    <Info className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
                    <p className="text-slate-400">Você não tem permissão para acessar esta página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            <Header />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <Tv className="w-5 h-5" />
                            <span className="text-sm font-semibold tracking-wider uppercase">Painel Administrativo</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                            ZK TV
                        </h1>
                    </div>

                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar ao Dashboard
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('games')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'games'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Jogos
                    </button>
                    <button
                        onClick={() => setActiveTab('standings')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'standings'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Trophy className="w-4 h-4" />
                        Classificação
                    </button>
                    <button
                        onClick={() => setActiveTab('clips')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'clips'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        Clipes Inéditos
                    </button>
                    <button
                        onClick={() => setActiveTab('squad')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'squad'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Elenco
                    </button>

                </div>

                {
                    loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-slate-400 animate-pulse">Carregando dados...</p>
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {activeTab === 'games' && (
                                <motion.div
                                    key="games"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold">Gerenciamento de Jogos</h3>
                                        <button
                                            onClick={() => {
                                                setEditingGame(null);
                                                setGameForm({
                                                    opponent: '',
                                                    date: new Date().toISOString(),
                                                    venue: '',
                                                    competition: 'Campeonato Mineiro',
                                                    is_home: true,
                                                    banner_url: '',
                                                    status: 'upcoming',
                                                    score_home: 0,
                                                    score_away: 0
                                                });
                                                setIsAddingGame(true);
                                            }}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Novo Jogo
                                        </button>
                                    </div>

                                    {isAddingGame && (
                                        <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-3xl backdrop-blur-xl">
                                            <div className="flex items-center justify-between mb-8">
                                                <h4 className="text-xl font-black italic uppercase tracking-tight text-white">
                                                    {editingGame ? 'Editar Jogo' : 'Novo Jogo'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                                    <Zap className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase">Live Preview</span>
                                                </div>
                                            </div>

                                            {/* Match Preview Section */}
                                            <div className="mb-10 p-8 rounded-3xl bg-slate-950/50 border border-slate-800 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-50"></div>
                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex-1 flex flex-col items-center gap-3">
                                                        <TeamLogo teamName="Cruzeiro" size="xl" />
                                                    </div>

                                                    <div className="flex flex-col items-center gap-2 px-8">
                                                        <div className="text-3xl font-black text-slate-700 italic group-hover:text-blue-500/50 transition-colors">VS</div>
                                                        <div className="px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                                                {gameForm.competition || 'Competição'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 flex flex-col items-center gap-3">
                                                        <TeamLogo
                                                            teamName={gameForm.opponent || 'Adversário'}
                                                            customLogo={gameForm.opponent_logo}
                                                            size="xl"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Adversário</label>
                                                    <input
                                                        type="text"
                                                        list="opponents-list"
                                                        value={gameForm.opponent}
                                                        onChange={(e) => setGameForm({ ...gameForm, opponent: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Selecione ou digite o time"
                                                    />
                                                    <datalist id="opponents-list">
                                                        {filteredOpponents.map(team => (
                                                            <option key={team} value={team} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Escudo Customizado (Opcional)</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={gameForm.opponent_logo || ''}
                                                            onChange={(e) => setGameForm({ ...gameForm, opponent_logo: e.target.value })}
                                                            className="flex-grow bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                            placeholder="URL do escudo"
                                                        />
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileUpload(e, 'logo')}
                                                                className="hidden"
                                                                id="team-logo-upload"
                                                            />
                                                            <label
                                                                htmlFor="team-logo-upload"
                                                                className="flex items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition-all border border-slate-700"
                                                                title="Upload de Logo"
                                                            >
                                                                <Upload className="w-5 h-5" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Competição</label>
                                                    <select
                                                        value={gameForm.competition}
                                                        onChange={(e) => setGameForm({ ...gameForm, competition: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                    >
                                                        <option value="">Selecione a Competição</option>
                                                        {COMPETITIONS.map(comp => (
                                                            <option key={comp} value={comp}>{comp}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Data e Hora</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={isoToDatetimeLocal(gameForm.date)}
                                                        onChange={(e) => setGameForm({ ...gameForm, date: datetimeLocalToISO(e.target.value) })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Local</label>
                                                    <input
                                                        type="text"
                                                        value={gameForm.venue}
                                                        onChange={(e) => setGameForm({ ...gameForm, venue: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Status da Partida</label>
                                                    <select
                                                        value={gameForm.status}
                                                        onChange={(e) => setGameForm({ ...gameForm, status: e.target.value as any })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold"
                                                    >
                                                        <option value="upcoming" className="text-emerald-500">Próximo Jogo</option>
                                                        <option value="live" className="text-red-500">Ao Vivo</option>
                                                        <option value="finished" className="text-slate-400">Partida Finalizada</option>
                                                    </select>
                                                </div>

                                                {(gameForm.status === 'live' || gameForm.status === 'finished') && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm text-slate-400 mb-2">Gols {gameForm.is_home ? 'do Cruzeiro' : 'do Adversário'} (Casa)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={gameForm.score_home ?? 0}
                                                                onChange={(e) => setGameForm({ ...gameForm, score_home: parseInt(e.target.value) || 0 })}
                                                                className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-black text-center"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm text-slate-400 mb-2">Gols {!gameForm.is_home ? 'do Cruzeiro' : 'do Adversário'} (Fora)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={gameForm.score_away ?? 0}
                                                                onChange={(e) => setGameForm({ ...gameForm, score_away: parseInt(e.target.value) || 0 })}
                                                                className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-black text-center"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm text-slate-400 mb-2">Banner do Jogo (Opcional)</label>
                                                    <div className="space-y-4">
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <input
                                                                type="url"
                                                                value={gameForm.banner_url || ''}
                                                                onChange={(e) => setGameForm({ ...gameForm, banner_url: e.target.value })}
                                                                className="flex-grow bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                                placeholder="URL da imagem ou faça upload abaixo"
                                                            />
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handleFileUpload}
                                                                    className="hidden"
                                                                    id="game-banner-upload"
                                                                    disabled={bannerUploading}
                                                                />
                                                                <label
                                                                    htmlFor="game-banner-upload"
                                                                    className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold cursor-pointer transition-all border border-blue-500/30 hover:bg-blue-500/10 ${bannerUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    {bannerUploading ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                                    ) : (
                                                                        <Upload className="w-5 h-5" />
                                                                    )}
                                                                    {bannerUploading ? 'Enviando...' : 'Fazer Upload'}
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {gameForm.banner_url && (
                                                            <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video max-h-[200px]">
                                                                <img
                                                                    src={gameForm.banner_url}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setGameForm({ ...gameForm, banner_url: '' })}
                                                                        className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button
                                                    onClick={() => setIsAddingGame(false)}
                                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveGame}
                                                    disabled={saving}
                                                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all"
                                                >
                                                    {saving ? 'Salvando...' : 'Salvar Jogo'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {games.map(game => {
                                            const oppColors = game.opponent ? getTeamColors(game.opponent) : { primary: '#334155' };

                                            return (
                                                <div key={game.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl group hover:border-blue-500/50 transition-all overflow-hidden relative">
                                                    {/* Card Background Glow */}
                                                    <div
                                                        className="absolute -top-24 -right-24 w-48 h-48 blur-[100px] transition-all"
                                                        style={{ backgroundColor: `${oppColors.primary}20` }}
                                                    ></div>

                                                    {/* Banner do jogo (se houver) */}
                                                    <div className="h-32 w-full overflow-hidden relative">
                                                        {game.banner_url ? (
                                                            <img src={game.banner_url} alt="" className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-700" />
                                                        ) : (
                                                            <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                                                                <Tv className="w-12 h-12 text-slate-800 opacity-20" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>

                                                        {/* Competition Badge */}
                                                        <div className="absolute top-4 left-4">
                                                            <span className="px-3 py-1 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                                {game.competition}
                                                            </span>
                                                        </div>

                                                        <div className="absolute top-4 right-4 flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingGame(game);
                                                                    setGameForm(game);
                                                                    setIsAddingGame(true);
                                                                }}
                                                                className="p-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:bg-blue-600 hover:border-blue-500 rounded-xl transition-all shadow-lg"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteGame(game.id)}
                                                                className="p-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:bg-red-600 hover:border-red-500 rounded-xl transition-all shadow-lg"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 relative -mt-12">
                                                        <div className="flex items-center justify-between mb-8">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <TeamLogo teamName="Cruzeiro" size="lg" showName={false} />
                                                                <span className="text-xs font-black text-white uppercase">Cruzeiro</span>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-3">
                                                                {game.status === 'live' ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">AO VIVO</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-xl border border-slate-800 px-6 py-2 rounded-2xl shadow-2xl">
                                                                            <span className="text-3xl font-black text-white leading-none">{game.score_home ?? 0}</span>
                                                                            <span className="text-slate-700 font-black">-</span>
                                                                            <span className="text-3xl font-black text-white leading-none">{game.score_away ?? 0}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center">
                                                                        {game.score_home != null && game.score_away != null ? (
                                                                            <div className="flex items-center gap-4 bg-slate-950/50 px-6 py-2 rounded-2xl border border-slate-800/50 mb-1">
                                                                                <span className="text-2xl font-black text-white opacity-80">{game.score_home}</span>
                                                                                <span className="text-slate-800 font-black">X</span>
                                                                                <span className="text-2xl font-black text-white opacity-80">{game.score_away}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-12 h-12 rounded-full border-2 border-slate-800/50 flex items-center justify-center mb-1">
                                                                                <span className="text-xs font-black text-slate-700 italic">VS</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${game.status === 'upcoming' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                    game.status === 'live' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                        'bg-slate-800/50 text-slate-500 border-slate-700/50'
                                                                    }`}>
                                                                    {game.status === 'upcoming' ? 'PRÓXIMO' : game.status === 'live' ? 'AO VIVO' : 'ENCERRADO'}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-2">
                                                                <TeamLogo
                                                                    teamName={game.opponent}
                                                                    customLogo={game.opponent_logo}
                                                                    size="lg"
                                                                    showName={false}
                                                                />
                                                                <span className="text-xs font-black text-white uppercase truncate max-w-[80px]">
                                                                    {game.opponent}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 bg-slate-950/40 backdrop-blur-sm border border-slate-800/50 rounded-2xl py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3.5 h-3.5 text-blue-500/70" />
                                                                    <span className="font-bold">
                                                                        {new Date(game.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                {game.venue && (
                                                                    <>
                                                                        <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                                                                        <div className="flex items-center gap-2">
                                                                            <MapPin className="w-3.5 h-3.5 text-blue-500/70" />
                                                                            <span className="font-bold truncate max-w-[120px]">{game.venue}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {games.length === 0 && !isAddingGame && (
                                            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                                                <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                                <p className="text-slate-500">Nenhum jogo cadastrado.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'standings' && (
                                <motion.div
                                    key="standings"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4 mb-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h3 className="text-xl font-bold mb-2">Tabela de Classificação</h3>
                                                <p className="text-sm text-slate-400">Gerencie as tabelas de todas as competições</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {!isBulkEditing ? (
                                                    <button
                                                        onClick={() => {
                                                            setBulkStandings([...standings]);
                                                            setIsBulkEditing(true);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-black uppercase transition-all"
                                                    >
                                                        <Zap className="w-4 h-4 text-yellow-500" />
                                                        Sincronização Rápida
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setIsBulkEditing(false)}
                                                            className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-black uppercase"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={handleSaveBulkStandings}
                                                            disabled={saving}
                                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-xs font-black uppercase shadow-lg shadow-green-600/20"
                                                        >
                                                            {saving ? 'Salvando...' : 'Salvar Tudo'}
                                                        </button>
                                                    </div>
                                                )}
                                                <select
                                                    value={selectedCompetition}
                                                    onChange={(e) => {
                                                        setSelectedCompetition(e.target.value);
                                                        setStandingForm(prev => ({ ...prev, competition: e.target.value }));
                                                    }}
                                                    className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    {COMPETITIONS.filter(c => c !== 'Amistoso').map(comp => (
                                                        <option key={comp} value={comp}>{comp}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={() => {
                                                setEditingStanding(null);
                                                setStandingForm({
                                                    team: '',
                                                    position: standings.length + 1,
                                                    points: 0,
                                                    played: 0,
                                                    won: 0,
                                                    drawn: 0,
                                                    lost: 0,
                                                    goals_for: 0,
                                                    goals_against: 0,
                                                    is_cruzeiro: false,
                                                    competition: selectedCompetition
                                                });
                                                setIsAddingStanding(true);
                                            }}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Novo Time
                                        </button>
                                    </div>

                                    {isAddingStanding && (
                                        <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-3xl backdrop-blur-xl">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-lg font-bold">Informações do Time</h4>
                                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-500/20 px-3 py-1 rounded-full">
                                                    {standingForm.competition || selectedCompetition}
                                                </span>
                                            </div>
                                            <div className="mb-6">
                                                <label className="block text-sm text-slate-400 mb-2">Competição</label>
                                                <select
                                                    value={standingForm.competition || selectedCompetition}
                                                    onChange={(e) => setStandingForm({ ...standingForm, competition: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    {COMPETITIONS.filter(c => c !== 'Amistoso').map(comp => (
                                                        <option key={comp} value={comp}>{comp}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm text-slate-400 mb-2">Time</label>
                                                    <input
                                                        type="text"
                                                        value={standingForm.team}
                                                        onChange={(e) => setStandingForm({ ...standingForm, team: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Posição</label>
                                                    <input
                                                        type="number"
                                                        value={standingForm.position}
                                                        onChange={(e) => setStandingForm({ ...standingForm, position: parseInt(e.target.value) })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Pontos</label>
                                                    <input
                                                        type="number"
                                                        value={standingForm.points}
                                                        onChange={(e) => setStandingForm({ ...standingForm, points: parseInt(e.target.value) })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Jogos</label>
                                                    <input
                                                        type="number"
                                                        value={standingForm.played}
                                                        onChange={(e) => setStandingForm({ ...standingForm, played: parseInt(e.target.value) })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Vitórias</label>
                                                    <input
                                                        type="number"
                                                        value={standingForm.won}
                                                        onChange={(e) => setStandingForm({ ...standingForm, won: parseInt(e.target.value) })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-end pb-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={standingForm.is_cruzeiro}
                                                            onChange={(e) => setStandingForm({ ...standingForm, is_cruzeiro: e.target.checked })}
                                                            className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm font-bold">É o Cruzeiro?</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button onClick={() => setIsAddingStanding(false)} className="px-6 py-3 bg-slate-800 rounded-xl font-bold">Cancelar</button>
                                                <button onClick={handleSaveStanding} className="px-8 py-3 bg-blue-600 rounded-xl font-bold">Salvar</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-sm">
                                        <table className="w-full text-left">
                                            <thead className="border-b border-slate-800 bg-slate-900/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-sm font-bold">#</th>
                                                    <th className="px-6 py-4 text-sm font-bold">Time</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">PTS</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">PJ</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">V</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">E</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">D</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">Forma</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">Tend.</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-center">Próximo</th>
                                                    <th className="px-6 py-4 text-sm font-bold text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {(isBulkEditing ? bulkStandings : standings).map((team, idx) => {
                                                    const updateBulk = (key: keyof CruzeiroStanding, val: any) => {
                                                        const newBulk = [...bulkStandings];
                                                        (newBulk[idx] as any)[key] = val;
                                                        setBulkStandings(newBulk);
                                                    };

                                                    return (
                                                        <tr key={team.id} className={team.is_cruzeiro ? 'bg-blue-600/10' : ''}>
                                                            <td className="px-6 py-4 font-black">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.position}
                                                                        onChange={(e) => updateBulk('position', parseInt(e.target.value) || 0)}
                                                                        className="w-12 bg-slate-950 border border-slate-800 rounded p-1 text-center"
                                                                    />
                                                                ) : `${team.position}º`}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${team.is_cruzeiro ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                                                    {team.is_cruzeiro ? 'CRU' : team.team.substring(0, 3).toUpperCase()}
                                                                </div>
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={team.team}
                                                                        onChange={(e) => updateBulk('team', e.target.value)}
                                                                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 flex-1"
                                                                    />
                                                                ) : team.team}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.points}
                                                                        onChange={(e) => updateBulk('points', parseInt(e.target.value) || 0)}
                                                                        className="w-10 bg-slate-950 border border-slate-800 rounded p-1 text-center font-black text-blue-400"
                                                                    />
                                                                ) : <span className="font-black text-blue-400">{team.points}</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.played}
                                                                        onChange={(e) => updateBulk('played', parseInt(e.target.value) || 0)}
                                                                        className="w-10 bg-slate-950 border border-slate-800 rounded p-1 text-center"
                                                                    />
                                                                ) : team.played}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.won}
                                                                        onChange={(e) => updateBulk('won', parseInt(e.target.value) || 0)}
                                                                        className="w-10 bg-slate-950 border border-slate-800 rounded p-1 text-center"
                                                                    />
                                                                ) : team.won}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.drawn}
                                                                        onChange={(e) => updateBulk('drawn', parseInt(e.target.value) || 0)}
                                                                        className="w-10 bg-slate-950 border border-slate-800 rounded p-1 text-center"
                                                                    />
                                                                ) : team.drawn}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.lost}
                                                                        onChange={(e) => updateBulk('lost', parseInt(e.target.value) || 0)}
                                                                        className="w-10 bg-slate-950 border border-slate-800 rounded p-1 text-center"
                                                                    />
                                                                ) : team.lost}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={team.last_5 || ''}
                                                                        placeholder="ex: VEDVV"
                                                                        onChange={(e) => updateBulk('last_5', e.target.value.toUpperCase())}
                                                                        className="w-20 bg-slate-950 border border-slate-800 rounded p-1 text-center text-xs"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-mono">{team.last_5 || '-'}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={team.prev_position || 0}
                                                                        onChange={(e) => updateBulk('prev_position', parseInt(e.target.value) || 0)}
                                                                        className="w-12 bg-slate-950 border border-slate-800 rounded p-1 text-center text-xs"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs">{team.prev_position || '-'}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {isBulkEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={team.next_opponent || ''}
                                                                        placeholder="Próximo"
                                                                        onChange={(e) => updateBulk('next_opponent', e.target.value)}
                                                                        className="w-24 bg-slate-950 border border-slate-800 rounded p-1 text-xs"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs truncate max-w-[80px] block">{team.next_opponent || '-'}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {!isBulkEditing && (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingStanding(team);
                                                                                setStandingForm(team);
                                                                                setIsAddingStanding(true);
                                                                            }}
                                                                            className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteStanding(team.id)}
                                                                            className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {standings.length === 0 && (
                                            <div className="py-20 text-center">
                                                <p className="text-slate-500">Nenhum time na tabela.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'clips' && (
                                <motion.div
                                    key="clips-tab"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Clipes Inéditos</h2>
                                            <p className="text-slate-400">Gerencie o feed de vídeos exclusivos para os torcedores.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingClip(null);
                                                setClipForm({ title: '', youtube_url: '', description: '', is_active: true, category: 'Clipes' });
                                                setIsAddingClip(true);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Novo Clipe
                                        </button>
                                    </div>

                                    {isAddingClip && (
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                {editingClip ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
                                                {editingClip ? 'Editar Clipe' : 'Novo Clipe'}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm text-slate-400 mb-2">Título do Vídeo</label>
                                                    <input
                                                        type="text"
                                                        value={clipForm.title}
                                                        onChange={(e) => setClipForm({ ...clipForm, title: e.target.value })}
                                                        placeholder="Ex: Bastidores da Vitória"
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">URL ou ID do YouTube</label>
                                                    <input
                                                        type="text"
                                                        value={clipForm.youtube_url}
                                                        onChange={(e) => setClipForm({ ...clipForm, youtube_url: e.target.value })}
                                                        placeholder="youtube.com/watch?v=..."
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Categoria</label>
                                                    <select
                                                        value={clipForm.category}
                                                        onChange={(e) => setClipForm({ ...clipForm, category: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="Clipes">Clipes</option>
                                                        <option value="Bastidores">Bastidores</option>
                                                        <option value="Entrevistas">Entrevistas</option>
                                                        <option value="Melhores Momentos">Melhores Momentos</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm text-slate-400 mb-2">Descrição (Opcional)</label>
                                                    <textarea
                                                        value={clipForm.description || ''}
                                                        onChange={(e) => setClipForm({ ...clipForm, description: e.target.value })}
                                                        placeholder="Uma breve descrição sobre o vídeo..."
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="clip-active"
                                                        checked={clipForm.is_active}
                                                        onChange={(e) => setClipForm({ ...clipForm, is_active: e.target.checked })}
                                                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600"
                                                    />
                                                    <label htmlFor="clip-active" className="text-sm font-bold cursor-pointer">Visível no app?</label>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button onClick={() => setIsAddingClip(false)} className="px-6 py-3 bg-slate-800 rounded-xl font-bold">Cancelar</button>
                                                <button onClick={handleSaveClip} className="px-8 py-3 bg-blue-600 rounded-xl font-bold">Salvar</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {clips.map((clip) => (
                                            <div key={clip.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden group">
                                                <div className="relative aspect-video">
                                                    <img
                                                        src={getYouTubeThumbnail(clip.youtube_url)}
                                                        alt={clip.title}
                                                        className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                    />
                                                    <div className="absolute top-3 right-3 flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingClip(clip);
                                                                setClipForm(clip);
                                                                setIsAddingClip(true);
                                                            }}
                                                            className="p-2 bg-blue-600 rounded-lg text-white shadow-lg"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClip(clip.id)}
                                                            className="p-2 bg-red-600 rounded-lg text-white shadow-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute bottom-3 left-3">
                                                        <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-black uppercase text-blue-400 border border-blue-500/30">
                                                            {clip.category}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h4 className="font-bold text-white mb-1 truncate">{clip.title}</h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">{clip.description || 'Sem descrição.'}</p>
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <span className={`text-[10px] font-black uppercase ${clip.is_active ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                            {clip.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-600">
                                                            {new Date(clip.created_at).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {clips.length === 0 && !isAddingClip && (
                                            <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                                <Tv className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                                <p className="text-slate-500">Nenhum clipe cadastrado.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'squad' && (
                                <motion.div
                                    key="squad"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-md">
                                        <div>
                                            <h2 className="text-2xl font-black text-white mb-2">Gerenciar Elenco</h2>
                                            <p className="text-slate-400 text-sm">Adicione e edite os jogadores disponíveis para a escalação.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingPlayer(null);
                                                setPlayerForm({
                                                    name: '',
                                                    full_name: '',
                                                    photo_url: '',
                                                    position: 'MEI',
                                                    number: 0,
                                                    is_active: true
                                                });
                                                setIsAddingPlayer(true);
                                            }}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Novo Jogador
                                        </button>
                                    </div>

                                    {isAddingPlayer && (
                                        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl space-y-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-blue-600/10 rounded-2xl">
                                                    <Users className="w-6 h-6 text-blue-500" />
                                                </div>
                                                <h3 className="text-xl font-bold">{editingPlayer ? 'Editar Jogador' : 'Novo Jogador'}</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Foto do Atleta</label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-20 h-20 bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
                                                            {playerForm.photo_url ? (
                                                                <img src={playerForm.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Users className="w-8 h-8 text-slate-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl cursor-pointer transition-all">
                                                                <Upload className="w-4 h-4" />
                                                                <span className="text-sm font-medium">{playerPhotoUploading ? 'Enviando...' : 'Carregar Foto'}</span>
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'player')} disabled={playerPhotoUploading} />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Nome Curto (Ex: Matheus Pereira)</label>
                                                    <input
                                                        type="text"
                                                        value={playerForm.name}
                                                        onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-2">Nome Completo</label>
                                                    <input
                                                        type="text"
                                                        value={playerForm.full_name}
                                                        onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-slate-400 mb-2">Posição</label>
                                                        <select
                                                            value={playerForm.position}
                                                            onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value as any })}
                                                            className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="GOL">Goleiro</option>
                                                            <option value="LAT">Lateral</option>
                                                            <option value="ZAG">Zagueiro</option>
                                                            <option value="MEI">Meio-Campo</option>
                                                            <option value="ATA">Atacante</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-slate-400 mb-2">Número</label>
                                                        <input
                                                            type="number"
                                                            value={playerForm.number}
                                                            onChange={(e) => setPlayerForm({ ...playerForm, number: parseInt(e.target.value) })}
                                                            className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="player-active"
                                                        checked={playerForm.is_active}
                                                        onChange={(e) => setPlayerForm({ ...playerForm, is_active: e.target.checked })}
                                                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600"
                                                    />
                                                    <label htmlFor="player-active" className="text-sm font-bold cursor-pointer">Ativo no Elenco?</label>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-4">
                                                <button
                                                    onClick={() => setIsAddingPlayer(false)}
                                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSavePlayer}
                                                    disabled={saving}
                                                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                                                >
                                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Salvar Jogador
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {players.map((player) => (
                                            <div key={player.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 group text-left">
                                                <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 border border-slate-700">
                                                    {player.photo_url ? (
                                                        <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold">
                                                            {player.position}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-white truncate">{player.name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{player.position}</span>
                                                        <span className="text-[10px] text-slate-500">#{player.number}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => {
                                                            setEditingPlayer(player);
                                                            setPlayerForm(player);
                                                            setIsAddingPlayer(true);
                                                        }}
                                                        className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlayer(player.id)}
                                                        className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {players.length === 0 && !isAddingPlayer && (
                                            <div className="col-span-full py-10 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                                                <p className="text-slate-500">Nenhum jogador cadastrado.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    )
                }
            </main >

            <Footer />
        </div >
    );
};

export default AdminZkTVPage;
