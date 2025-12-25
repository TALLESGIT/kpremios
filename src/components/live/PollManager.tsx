import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, X, Pin, Trash2, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Poll {
  id: string;
  stream_id: string;
  question: string;
  options: Array<{ id: number; text: string }>;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
}

interface PollManagerProps {
  streamId: string;
}

const PollManager: React.FC<PollManagerProps> = ({ streamId }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<Array<{ id: number; text: string }>>([
    { id: 1, text: '' },
    { id: 2, text: '' }
  ]);

  useEffect(() => {
    loadPolls();
    
    // Escutar mudanças em tempo real
    const channel = supabase
      .channel(`polls_${streamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stream_polls',
        filter: `stream_id=eq.${streamId}`
      }, () => {
        loadPolls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const loadPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_polls')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar enquetes:', error);
      toast.error('Erro ao carregar enquetes');
    }
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      toast.error('Máximo de 6 opções permitidas');
      return;
    }
    setOptions([...options, { id: options.length + 1, text: '' }]);
  };

  const handleRemoveOption = (id: number) => {
    if (options.length <= 2) {
      toast.error('Mínimo de 2 opções necessárias');
      return;
    }
    setOptions(options.filter(opt => opt.id !== id));
  };

  const handleOptionChange = (id: number, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) {
      toast.error('Digite a pergunta da enquete');
      return;
    }

    const validOptions = options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      toast.error('Adicione pelo menos 2 opções');
      return;
    }

    try {
      // Desativar/desfixar outras enquetes fixadas antes de criar a nova
      await supabase
        .from('stream_polls')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true)
        .eq('is_active', true);

      // Criar nova enquete ativa e fixada
      const { data: newPoll, error } = await supabase
        .from('stream_polls')
        .insert({
          stream_id: streamId,
          created_by: user?.id,
          question: question.trim(),
          options: validOptions.map((opt, idx) => ({ id: idx + 1, text: opt.text.trim() })),
          is_active: true,
          is_pinned: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ PollManager: Erro ao criar enquete:', error);
        throw error;
      }

      console.log('✅ PollManager: Enquete criada com sucesso:', {
        id: newPoll?.id,
        question: newPoll?.question,
        is_active: newPoll?.is_active,
        is_pinned: newPoll?.is_pinned
      });

      toast.success('Enquete criada e fixada no chat!');
      setShowCreateModal(false);
      setQuestion('');
      setOptions([{ id: 1, text: '' }, { id: 2, text: '' }]);
      loadPolls();
    } catch (error: any) {
      console.error('Erro ao criar enquete:', error);
      toast.error('Erro ao criar enquete: ' + error.message);
    }
  };

  const handleTogglePin = async (pollId: string, currentPinStatus: boolean) => {
    try {
      if (currentPinStatus) {
        // Desfixar
        const { error } = await supabase
          .from('stream_polls')
          .update({ is_pinned: false })
          .eq('id', pollId);
        if (error) throw error;
        toast.success('Enquete desfixada');
      } else {
        // Desfixar todas as outras primeiro
        await supabase
          .from('stream_polls')
          .update({ is_pinned: false })
          .eq('stream_id', streamId)
          .neq('id', pollId);
        
        // Fixar esta
        const { error } = await supabase
          .from('stream_polls')
          .update({ is_pinned: true })
          .eq('id', pollId);
        if (error) throw error;
        toast.success('Enquete fixada no chat!');
      }
      loadPolls();
    } catch (error: any) {
      console.error('Erro ao alterar fixação:', error);
      toast.error('Erro ao alterar fixação');
    }
  };

  const handleDeactivatePoll = async (pollId: string) => {
    if (!confirm('Desativar esta enquete? Os usuários não poderão mais votar.')) return;
    
    try {
      const { error } = await supabase
        .from('stream_polls')
        .update({ is_active: false, is_pinned: false })
        .eq('id', pollId);

      if (error) throw error;
      toast.success('Enquete desativada');
      loadPolls();
    } catch (error: any) {
      console.error('Erro ao desativar enquete:', error);
      toast.error('Erro ao desativar enquete');
    }
  };

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-black text-white uppercase italic">Gerenciar Enquetes</h3>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Enquete
        </button>
      </div>

      {/* Lista de Enquetes */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nenhuma enquete criada ainda</p>
        ) : (
          polls.map((poll) => (
            <div
              key={poll.id}
              className="bg-slate-900/60 rounded-xl border border-white/5 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {poll.is_pinned && (
                      <Pin className="w-4 h-4 text-blue-400 fill-blue-400" />
                    )}
                    <h4 className="text-white font-bold text-sm">{poll.question}</h4>
                    {poll.is_active ? (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-black uppercase rounded">
                        Ativa
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {poll.options.map((opt: any) => (
                      <div key={opt.id} className="text-slate-300 text-xs pl-4">
                        • {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(poll.id, poll.is_pinned)}
                    className={`p-2 rounded-lg transition-all ${
                      poll.is_pinned
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                    title={poll.is_pinned ? 'Desfixar' : 'Fixar no chat'}
                  >
                    <Pin className={`w-4 h-4 ${poll.is_pinned ? 'fill-current' : ''}`} />
                  </button>
                  {poll.is_active && (
                    <button
                      onClick={() => handleDeactivatePoll(poll.id)}
                      className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
                      title="Desativar enquete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Criação */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 rounded-2xl border border-white/10 p-6 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white uppercase">Criar Nova Enquete</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setQuestion('');
                    setOptions([{ id: 1, text: '' }, { id: 2, text: '' }]);
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 uppercase mb-2">
                    Pergunta da Enquete
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ex: Qual time vai ganhar?"
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 uppercase mb-2">
                    Opções (mínimo 2, máximo 6)
                  </label>
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                          placeholder={`Opção ${opt.id}`}
                          className="flex-1 px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(opt.id)}
                            className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {options.length < 6 && (
                    <button
                      onClick={handleAddOption}
                      className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Opção
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setQuestion('');
                      setOptions([{ id: 1, text: '' }, { id: 2, text: '' }]);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-black uppercase transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreatePoll}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase transition-all shadow-lg shadow-blue-600/20"
                  >
                    Criar e Fixar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PollManager;

