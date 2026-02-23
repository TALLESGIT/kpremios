import React, { useState, useEffect } from 'react';
import { X, Save, Users, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface SimpleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: any;
  onUpdate?: () => void;
}

const SimpleEditModal: React.FC<SimpleEditModalProps> = ({ isOpen, onClose, game, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    max_participants: 50
  });
  const [loading, setLoading] = useState(false);
  const [maxInput, setMaxInput] = useState<string>('50');

  useEffect(() => {
    if (game) {
      setFormData({
        title: game.title || '',
        description: game.description || '',
        max_participants: game.max_participants || 50
      });
      setMaxInput(String(game.max_participants || 50));
    }
  }, [game]);

  const handleSave = async () => {
    if (!game?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          title: formData.title,
          description: formData.description,
          max_participants: formData.max_participants
        })
        .eq('id', game.id);

      if (error) throw error;

      toast.success('Sorteio atualizado com sucesso!');
      onUpdate?.();
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar sorteio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Editar Sorteio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título do Jogo
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Título do jogo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Descrição do jogo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo de Participantes
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                min="10"
                max="1000"
                value={maxInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setMaxInput(digits);
                }}
                onBlur={() => {
                  const parsed = parseInt(maxInput || '0');
                  const clamped = isNaN(parsed) ? 50 : Math.max(10, Math.min(1000, parsed));
                  setFormData({ ...formData, max_participants: clamped });
                  setMaxInput(String(clamped));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-semibold"
                placeholder="50"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                números
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-1 text-center">
              Números disponíveis de 1 a {formData.max_participants}
            </p>
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !formData.title.trim()}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleEditModal;
