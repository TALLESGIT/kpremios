import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Clock, Shield } from 'lucide-react';

interface ChatModerationControlsProps {
    streamId: string;
}

const ChatModerationControls: React.FC<ChatModerationControlsProps> = ({ streamId }) => {
    const [slowModeSeconds, setSlowModeSeconds] = useState(0);
    const [moderatorsOnly, setModeratorsOnly] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();

        // Realtime para mudanças
        const channel = supabase.channel(`stream_settings_${streamId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${streamId}` },
                (payload) => {
                    const updated = payload.new as any;
                    setSlowModeSeconds(updated.slow_mode_seconds || 0);
                    setModeratorsOnly(updated.moderators_only_mode || false);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [streamId]);

    const loadSettings = async () => {
        try {
            const { data } = await supabase
                .from('live_streams')
                .select('slow_mode_seconds, moderators_only_mode')
                .eq('id', streamId)
                .single();

            if (data) {
                setSlowModeSeconds(data.slow_mode_seconds || 0);
                setModeratorsOnly(data.moderators_only_mode || false);
            }
        } catch (err) {
            console.error('Erro ao carregar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateSlowMode = async (seconds: number) => {
        try {
            await supabase
                .from('live_streams')
                .update({ slow_mode_seconds: seconds })
                .eq('id', streamId);

            setSlowModeSeconds(seconds);
            toast.success(seconds > 0 ? `Modo Slow: ${seconds}s` : 'Modo Slow desativado');
        } catch (err) {
            toast.error('Erro ao atualizar modo slow');
        }
    };

    const toggleModeratorsOnly = async () => {
        const newValue = !moderatorsOnly;
        try {
            await supabase
                .from('live_streams')
                .update({ moderators_only_mode: newValue })
                .eq('id', streamId);

            setModeratorsOnly(newValue);
            toast.success(newValue ? 'Chat apenas para moderadores' : 'Chat liberado para todos');
        } catch (err) {
            toast.error('Erro ao atualizar modo');
        }
    };

    if (loading) return null;

    return (
        <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 space-y-6">
            <h4 className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">
                Controles de Chat
            </h4>

            {/* Modo Slow */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <label className="text-sm font-black text-white uppercase italic">Modo Slow</label>
                    {slowModeSeconds > 0 && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-black rounded">
                            {slowModeSeconds}s
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {[0, 5, 10, 30, 60].map(seconds => (
                        <button
                            key={seconds}
                            onClick={() => updateSlowMode(seconds)}
                            className={`py-2 px-3 rounded-xl text-xs font-black uppercase transition-all border ${slowModeSeconds === seconds
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-slate-800/40 text-slate-400 border-white/5 hover:bg-slate-800'
                                }`}
                        >
                            {seconds === 0 ? 'OFF' : `${seconds}s`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Modo Apenas Moderadores */}
            <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div>
                        <p className="text-sm font-black text-white uppercase italic">Apenas Moderadores</p>
                        <p className="text-[10px] text-slate-500 font-medium">Bloquear chat para usuários</p>
                    </div>
                </div>
                <button
                    onClick={toggleModeratorsOnly}
                    className={`w-14 h-7 rounded-full transition-all ${moderatorsOnly ? 'bg-amber-500' : 'bg-slate-700'
                        }`}
                >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all ${moderatorsOnly ? 'translate-x-8' : 'translate-x-1'
                        }`} />
                </button>
            </div>
        </div>
    );
};

export default ChatModerationControls;
