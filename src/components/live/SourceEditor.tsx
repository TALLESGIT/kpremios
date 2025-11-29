import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Eye, EyeOff, Type, Image as ImageIcon, Award, Grid } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Source {
  id: string;
  scene_id: string;
  type: 'video' | 'camera' | 'screen' | 'screenshare' | 'image' | 'text' | 'logo' | 'sponsor' | 'scoreboard';
  name: string;
  url?: string;
  content: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  is_visible: boolean;
  opacity: number;
  transform: any;
  animation: any;
}

interface SourceEditorProps {
  source: Source;
  onClose: () => void;
  onUpdate: (updatedSource: Source) => void;
  onDelete: () => void;
}

const SourceEditor: React.FC<SourceEditorProps> = ({ source, onClose, onUpdate, onDelete }) => {
  const [editedSource, setEditedSource] = useState<Source>(source);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stream_sources')
        .update({
          name: editedSource.name,
          url: editedSource.url,
          content: editedSource.content,
          position: editedSource.position,
          is_visible: editedSource.is_visible,
          opacity: editedSource.opacity,
          transform: editedSource.transform,
          animation: editedSource.animation
        })
        .eq('id', editedSource.id);

      if (error) throw error;

      onUpdate(editedSource);
      toast.success('Fonte atualizada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar fonte:', error);
      toast.error('Erro ao salvar fonte');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setEditedSource({ ...editedSource, url: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {editedSource.type === 'text' && <Type size={20} />}
            {(editedSource.type === 'image' || editedSource.type === 'logo') && <ImageIcon size={20} />}
            {editedSource.type === 'sponsor' && <Award size={20} />}
            {editedSource.type === 'scoreboard' && <Grid size={20} />}
            Editar Fonte: {editedSource.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditedSource({ ...editedSource, is_visible: !editedSource.is_visible })}
              className={`p-2 rounded transition-colors ${
                editedSource.is_visible ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:bg-slate-700'
              }`}
              title={editedSource.is_visible ? 'Ocultar' : 'Mostrar'}
            >
              {editedSource.is_visible ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Nome</label>
            <input
              type="text"
              value={editedSource.name}
              onChange={(e) => setEditedSource({ ...editedSource, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Configurações específicas por tipo */}
          {(editedSource.type === 'image' || editedSource.type === 'logo' || editedSource.type === 'sponsor') && (
            <div>
              <label className="block text-white text-sm font-medium mb-2">Imagem</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="edit-source-image"
                />
                <label
                  htmlFor="edit-source-image"
                  className="block w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded cursor-pointer text-center font-medium transition-colors"
                >
                  📁 Fazer Upload de Imagem
                </label>
                {editedSource.url && (
                  <div className="relative">
                    <img 
                      src={editedSource.url} 
                      alt="Preview" 
                      className="w-full h-48 object-contain rounded bg-slate-900 border border-slate-600" 
                    />
                  </div>
                )}
                <input
                  type="text"
                  value={editedSource.url || ''}
                  onChange={(e) => setEditedSource({ ...editedSource, url: e.target.value })}
                  placeholder="Ou cole uma URL de imagem..."
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {editedSource.type === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Texto</label>
                <textarea
                  value={editedSource.content.text || ''}
                  onChange={(e) => setEditedSource({ 
                    ...editedSource, 
                    content: { ...editedSource.content, text: e.target.value } 
                  })}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Tamanho da Fonte</label>
                  <input
                    type="number"
                    min="12"
                    max="120"
                    value={editedSource.content.fontSize || 24}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, fontSize: parseInt(e.target.value) } 
                    })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">Cor do Texto</label>
                  <input
                    type="color"
                    value={editedSource.content.color || '#ffffff'}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, color: e.target.value } 
                    })}
                    className="w-full h-10 bg-slate-700 rounded border border-slate-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Peso da Fonte</label>
                  <select
                    value={editedSource.content.fontWeight || 'bold'}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, fontWeight: e.target.value } 
                    })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Negrito</option>
                    <option value="bolder">Extra Negrito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">Alinhamento</label>
                  <select
                    value={editedSource.content.textAlign || 'left'}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, textAlign: e.target.value } 
                    })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centro</option>
                    <option value="right">Direita</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Cor de Fundo</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={editedSource.content.backgroundColor || '#000000'}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, backgroundColor: e.target.value } 
                    })}
                    className="w-20 h-10 bg-slate-700 rounded border border-slate-600 cursor-pointer"
                  />
                  <button
                    onClick={() => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, backgroundColor: 'transparent' } 
                    })}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                  >
                    Transparente
                  </button>
                </div>
              </div>
            </div>
          )}

          {editedSource.type === 'scoreboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Placar Cruzeiro</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editedSource.content.homeScore || 0}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, homeScore: parseInt(e.target.value) || 0 } 
                    })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none text-center text-2xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">Placar Adversário</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editedSource.content.awayScore || 0}
                    onChange={(e) => setEditedSource({ 
                      ...editedSource, 
                      content: { ...editedSource.content, awayScore: parseInt(e.target.value) || 0 } 
                    })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none text-center text-2xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Nome do Time Adversário</label>
                <input
                  type="text"
                  value={editedSource.content.awayTeam || 'Visitante'}
                  onChange={(e) => setEditedSource({ 
                    ...editedSource, 
                    content: { ...editedSource.content, awayTeam: e.target.value } 
                  })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Preview do Placar */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-xs mb-2">Preview:</p>
                <div className="bg-gradient-to-r from-blue-900/90 to-blue-800/90 backdrop-blur-sm rounded-lg p-4 border border-blue-400/50">
                  <div className="flex items-center justify-between gap-4 text-white">
                    <div className="text-center flex-1">
                      <div className="text-sm font-semibold">Cruzeiro</div>
                      <div className="text-3xl font-bold">{editedSource.content.homeScore || 0}</div>
                    </div>
                    <div className="text-xl font-bold">×</div>
                    <div className="text-center flex-1">
                      <div className="text-sm font-semibold">{editedSource.content.awayTeam || 'Visitante'}</div>
                      <div className="text-3xl font-bold">{editedSource.content.awayScore || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posição e Tamanho */}
          <div>
            <h4 className="text-white font-semibold mb-3">Posição e Tamanho</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Posição X (px)</label>
                <input
                  type="number"
                  min="0"
                  value={editedSource.position.x}
                  onChange={(e) => setEditedSource({ 
                    ...editedSource, 
                    position: { ...editedSource.position, x: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Posição Y (px)</label>
                <input
                  type="number"
                  min="0"
                  value={editedSource.position.y}
                  onChange={(e) => setEditedSource({ 
                    ...editedSource, 
                    position: { ...editedSource.position, y: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Largura (px)</label>
                <input
                  type="number"
                  min="10"
                  max="1920"
                  value={editedSource.position.width}
                  onChange={(e) => setEditedSource({ 
                    ...editedSource, 
                    position: { ...editedSource.position, width: parseInt(e.target.value) || 100 } 
                  })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Altura (px)</label>
                <input
                  type="number"
                  min="10"
                  max="1080"
                  value={editedSource.position.height}
                  onChange={(e) => setEditedSource({ 
                    ...editedSource, 
                    position: { ...editedSource.position, height: parseInt(e.target.value) || 100 } 
                  })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Opacidade */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Opacidade: {Math.round(editedSource.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={editedSource.opacity}
              onChange={(e) => setEditedSource({ ...editedSource, opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Camada (Z-Index) */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Camada (Z-Index)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={editedSource.position.zIndex}
              onChange={(e) => setEditedSource({ 
                ...editedSource, 
                position: { ...editedSource.position, zIndex: parseInt(e.target.value) || 0 } 
              })}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
            <p className="text-slate-400 text-xs mt-1">Maior valor = mais em cima</p>
          </div>
        </div>

        {/* Footer - Botões de Ação */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-between">
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Excluir Fonte
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceEditor;
