import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';
import { toast } from 'react-hot-toast';
import {
    Settings,
    Tv,
    Video,
    Calendar,
    Trophy,
    Save,
    Plus,
    Trash2,
    Edit2,
    Info,
    ChevronLeft
} from 'lucide-react';
import Header from '../../components/shared/Header';
import Footer from '../../components/shared/Footer';
import { CruzeiroSettings, CruzeiroGame, CruzeiroStanding } from '../../types';
import { useMemo } from 'react';

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

const AdminZkTVPage: React.FC = () => {
    const { currentUser } = useData();
    const [activeTab, setActiveTab] = useState<'settings' | 'games' | 'standings'>('settings');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [settings, setSettings] = useState<CruzeiroSettings | null>(null);
    const [liveUrl, setLiveUrl] = useState('');
    const [isLive, setIsLive] = useState(false);

    // Games State
    const [games, setGames] = useState<CruzeiroGame[]>([]);
    const [isAddingGame, setIsAddingGame] = useState(false);
    const [editingGame, setEditingGame] = useState<CruzeiroGame | null>(null);
    const [gameForm, setGameForm] = useState<Partial<CruzeiroGame>>({
        opponent: '',
        date: new Date().toISOString(),
        venue: '',
        competition: '',
        is_home: true,
        status: 'upcoming'
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
        competition: 'Série A'
    });

    useEffect(() => {
        if (currentUser?.is_admin) {
            loadData();
        }
    }, [currentUser]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load Settings
            const { data: settingsData } = await supabase
                .from('cruzeiro_settings')
                .select('*')
                .single();

            if (settingsData) {
                setSettings(settingsData);
                setLiveUrl(settingsData.live_url || '');
                setIsLive(settingsData.is_live || false);
            }

            // Load Games
            const { data: gamesData } = await supabase
                .from('cruzeiro_games')
                .select('*')
                .order('date', { ascending: true });

            if (gamesData) setGames(gamesData);

            // Load Standings
            const { data: standingsData } = await supabase
                .from('cruzeiro_standings')
                .select('*')
                .order('position', { ascending: true });

            if (standingsData) setStandings(standingsData);

        } catch (error) {
            console.error('Error loading ZK TV data:', error);
            toast.error('Erro ao carregar dados da ZK TV');
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('cruzeiro_settings')
                .upsert({
                    id: settings?.id || undefined,
                    live_url: liveUrl,
                    is_live: isLive,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success('Configurações salvas com sucesso!');
            loadData();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Erro ao salvar configurações');
        } finally {
            setSaving(false);
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
            const { error } = editingStanding
                ? await supabase.from('cruzeiro_standings').update(standingForm).eq('id', editingStanding.id)
                : await supabase.from('cruzeiro_standings').insert([standingForm]);

            if (error) throw error;
            toast.success('Classificação atualizada!');
            setIsAddingStanding(false);
            setEditingStanding(null);
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar classificação');
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
            loadData();
        } catch (error) {
            toast.error('Erro ao remover time');
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Configurações
                    </button>
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
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-slate-400 animate-pulse">Carregando dados...</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'settings' && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                            >
                                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                        <Video className="w-5 h-5 text-blue-500" />
                                        Transmissão ao Vivo
                                    </h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">URL da Live (YouTube Embed/Iframe Link)</label>
                                            <input
                                                type="text"
                                                value={liveUrl}
                                                onChange={(e) => setLiveUrl(e.target.value)}
                                                placeholder="https://www.youtube.com/embed/..."
                                                className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                            <div>
                                                <span className="block font-bold">Status da Live</span>
                                                <span className="text-sm text-slate-400">Ativar indicador "AO VIVO" no site</span>
                                            </div>
                                            <button
                                                onClick={() => setIsLive(!isLive)}
                                                className={`w-14 h-8 rounded-full transition-colors relative ${isLive ? 'bg-blue-600' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all ${isLive ? 'translate-x-6' : ''}`}></div>
                                            </button>
                                        </div>

                                        <button
                                            onClick={saveSettings}
                                            disabled={saving}
                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            {saving ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar Configurações</>}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                                        <Info className="w-10 h-10 text-blue-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Dica de Link</h3>
                                    <p className="text-slate-400">
                                        Use links do tipo <strong>embed</strong> para que o player funcione corretamente no site.
                                        Exemplo: <code>https://www.youtube.com/embed/VIDEO_ID</code>
                                    </p>
                                </div>
                            </motion.div>
                        )}

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
                                                venue: 'Mineirão',
                                                competition: 'Brasileirão Série A',
                                                is_home: true,
                                                status: 'upcoming'
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
                                        <h4 className="text-lg font-bold mb-6">{editingGame ? 'Editar Jogo' : 'Adicionar Novo Jogo'}</h4>
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
                                                    value={gameForm.date?.substring(0, 16)}
                                                    onChange={(e) => setGameForm({ ...gameForm, date: new Date(e.target.value).toISOString() })}
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
                                    {games.map(game => (
                                        <div key={game.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl group hover:border-blue-500/50 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{game.competition}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingGame(game);
                                                            setGameForm(game);
                                                            setIsAddingGame(true);
                                                        }}
                                                        className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteGame(game.id)}
                                                        className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-6">
                                                <div className="text-center flex-1">
                                                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-blue-500">CRU</div>
                                                    <span className="text-sm font-bold">Cruzeiro</span>
                                                </div>
                                                <div className="px-4 text-slate-500 font-black italic">VS</div>
                                                <div className="text-center flex-1">
                                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-slate-400">
                                                        {game.opponent.substring(0, 3).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-bold">{game.opponent}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(game.date).toLocaleString('pt-BR')}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Info className="w-4 h-4" />
                                                    {game.venue}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

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
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold">Tabela de Classificação</h3>
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
                                                competition: 'Série A'
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
                                        <h4 className="text-lg font-bold mb-6">Informações do Time</h4>
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
                                                <th className="px-6 py-4 text-sm font-bold text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {standings.map((team) => (
                                                <tr key={team.id} className={team.is_cruzeiro ? 'bg-blue-600/10' : ''}>
                                                    <td className="px-6 py-4 font-black">{team.position}º</td>
                                                    <td className="px-6 py-4 font-bold flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${team.is_cruzeiro ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                                            {team.is_cruzeiro ? 'CRU' : team.team.substring(0, 3).toUpperCase()}
                                                        </div>
                                                        {team.team}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-black text-blue-400">{team.points}</td>
                                                    <td className="px-6 py-4 text-center text-slate-400">{team.played}</td>
                                                    <td className="px-6 py-4 text-center text-slate-400">{team.won}</td>
                                                    <td className="px-6 py-4 text-center text-slate-400">{team.drawn}</td>
                                                    <td className="px-6 py-4 text-center text-slate-400">{team.lost}</td>
                                                    <td className="px-6 py-4 text-right">
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
                                                    </td>
                                                </tr>
                                            ))}
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
                    </AnimatePresence>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default AdminZkTVPage;
