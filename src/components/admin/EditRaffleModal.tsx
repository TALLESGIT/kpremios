import React, { useState, useEffect } from 'react';
import { X, Save, Users, Edit3, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface LiveGame {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
  participants_count?: number;
}

interface EditRaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: LiveGame | null;
  onUpdate: () => void;
}

const EditRaffleModal: React.FC<EditRaffleModalProps> = ({
  isOpen,
  onClose,
  raffle,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    max_participants: 50
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (raffle) {
      setFormData({
        title: raffle.title,
        description: raffle.description || '',
        max_participants: raffle.max_participants
      });
    }
  }, [raffle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raffle) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          title: formData.title,
          description: formData.description,
          max_participants: formData.max_participants
        })
        .eq('id', raffle.id);

      if (error) throw error;

      toast.success('Sorteio atualizado com sucesso!');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar sorteio');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNumbers = async () => {
    if (!raffle) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', raffle.id);

      if (error) throw error;

      toast.success('Números fechados! Não é mais possível escolher números.');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Erro ao fechar números');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !raffle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Editar Sorteio</h2>
              <p className="text-slate-400 text-sm">Configure as opções do sorteio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título do Sorteio
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Ex: Sorteio Resta Um - Edição Especial"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="Descreva as regras e prêmios do sorteio..."
              rows={3}
            />
          </div>

          {/* Máximo de Participantes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Máximo de Participantes
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 50 }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                min="2"
                max="1000"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                números
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Números disponíveis de 1 a {formData.max_participants}
            </p>
          </div>

          {/* Status Atual */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">Status Atual</h4>
                <p className="text-slate-400 text-sm">
                  {raffle.status === 'waiting' ? 'Aguardando participantes' : 
                   raffle.status === 'active' ? 'Números fechados' : 
                   'Finalizado'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                raffle.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                raffle.status === 'active' ? 'bg-green-500/20 text-green-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {raffle.status === 'waiting' ? 'Aguardando' :
                 raffle.status === 'active' ? 'Ativo' : 'Finalizado'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>

            {raffle.status === 'waiting' && (
              <button
                type="button"
                onClick={handleCloseNumbers}
                disabled={loading}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Fechar Números
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRaffleModal;
