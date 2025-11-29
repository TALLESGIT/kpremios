import React from 'react';
import { X, Copy, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  sources: Array<{
    type: 'image' | 'logo' | 'sponsor' | 'text' | 'scoreboard';
    name: string;
    content: any;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
    };
    opacity: number;
  }>;
}

const templates: Template[] = [
  {
    id: 'pre-game',
    name: 'Pré-Jogo',
    description: 'Logo central + Patrocinadores no rodapé',
    icon: '⚽',
    sources: [
      {
        type: 'logo',
        name: 'Logo Cruzeiro',
        content: {},
        position: { x: 310, y: 135, width: 300, height: 300, zIndex: 10 },
        opacity: 1
      },
      {
        type: 'text',
        name: 'Título Jogo',
        content: {
          text: 'TRANSMISSÃO AO VIVO',
          fontSize: 48,
          color: '#ffffff',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        },
        position: { x: 160, y: 50, width: 600, height: 80, zIndex: 11 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 1',
        content: {},
        position: { x: 50, y: 470, width: 150, height: 80, zIndex: 12 },
        opacity: 0.9
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 2',
        content: {},
        position: { x: 220, y: 470, width: 150, height: 80, zIndex: 12 },
        opacity: 0.9
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 3',
        content: {},
        position: { x: 550, y: 470, width: 150, height: 80, zIndex: 12 },
        opacity: 0.9
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 4',
        content: {},
        position: { x: 720, y: 470, width: 150, height: 80, zIndex: 12 },
        opacity: 0.9
      }
    ]
  },
  {
    id: 'live-game',
    name: 'Durante o Jogo',
    description: 'Placar + Logo pequeno + Patrocinador',
    icon: '🏆',
    sources: [
      {
        type: 'scoreboard',
        name: 'Placar',
        content: {
          homeScore: 0,
          awayScore: 0,
          awayTeam: 'Adversário'
        },
        position: { x: 310, y: 20, width: 300, height: 80, zIndex: 100 },
        opacity: 1
      },
      {
        type: 'logo',
        name: 'Logo Cruzeiro',
        content: {},
        position: { x: 780, y: 20, width: 80, height: 80, zIndex: 90 },
        opacity: 0.9
      },
      {
        type: 'sponsor',
        name: 'Patrocinador Principal',
        content: {},
        position: { x: 730, y: 470, width: 150, height: 80, zIndex: 85 },
        opacity: 0.8
      }
    ]
  },
  {
    id: 'half-time',
    name: 'Intervalo',
    description: 'Destaque para patrocinadores',
    icon: '⏸️',
    sources: [
      {
        type: 'text',
        name: 'Texto Intervalo',
        content: {
          text: 'INTERVALO',
          fontSize: 72,
          color: '#ffffff',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        },
        position: { x: 260, y: 200, width: 400, height: 120, zIndex: 10 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 1',
        content: {},
        position: { x: 100, y: 60, width: 200, height: 100, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 2',
        content: {},
        position: { x: 620, y: 60, width: 200, height: 100, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 3',
        content: {},
        position: { x: 100, y: 410, width: 200, height: 100, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 4',
        content: {},
        position: { x: 620, y: 410, width: 200, height: 100, zIndex: 8 },
        opacity: 1
      }
    ]
  },
  {
    id: 'post-game',
    name: 'Pós-Jogo',
    description: 'Resultado final + Agradecimentos',
    icon: '🎉',
    sources: [
      {
        type: 'scoreboard',
        name: 'Resultado Final',
        content: {
          homeScore: 0,
          awayScore: 0,
          awayTeam: 'Adversário'
        },
        position: { x: 260, y: 150, width: 400, height: 120, zIndex: 10 },
        opacity: 1
      },
      {
        type: 'text',
        name: 'Obrigado',
        content: {
          text: 'OBRIGADO POR ASSISTIR!',
          fontSize: 36,
          color: '#fbbf24',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        },
        position: { x: 210, y: 320, width: 500, height: 80, zIndex: 11 },
        opacity: 1
      },
      {
        type: 'text',
        name: 'Redes Sociais',
        content: {
          text: '@CruzeiroOficial',
          fontSize: 24,
          color: '#ffffff',
          fontWeight: 'normal',
          textAlign: 'center',
          backgroundColor: 'transparent'
        },
        position: { x: 310, y: 420, width: 300, height: 60, zIndex: 11 },
        opacity: 1
      },
      {
        type: 'logo',
        name: 'Logo Cruzeiro',
        content: {},
        position: { x: 360, y: 40, width: 200, height: 200, zIndex: 9 },
        opacity: 0.3
      }
    ]
  },
  {
    id: 'sponsors-grid',
    name: 'Grid de Patrocinadores',
    description: '6 patrocinadores em destaque',
    icon: '🏢',
    sources: [
      {
        type: 'text',
        name: 'Título',
        content: {
          text: 'PATROCINADORES',
          fontSize: 48,
          color: '#fbbf24',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        },
        position: { x: 260, y: 30, width: 400, height: 70, zIndex: 10 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 1',
        content: {},
        position: { x: 80, y: 130, width: 230, height: 120, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 2',
        content: {},
        position: { x: 345, y: 130, width: 230, height: 120, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 3',
        content: {},
        position: { x: 610, y: 130, width: 230, height: 120, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 4',
        content: {},
        position: { x: 80, y: 280, width: 230, height: 120, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 5',
        content: {},
        position: { x: 345, y: 280, width: 230, height: 120, zIndex: 8 },
        opacity: 1
      },
      {
        type: 'sponsor',
        name: 'Patrocinador 6',
        content: {},
        position: { x: 610, y: 280, width: 230, height: 120, zIndex: 8 },
        opacity: 1
      }
    ]
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Apenas placar discreto',
    icon: '📊',
    sources: [
      {
        type: 'scoreboard',
        name: 'Placar Pequeno',
        content: {
          homeScore: 0,
          awayScore: 0,
          awayTeam: 'Adversário'
        },
        position: { x: 650, y: 20, width: 250, height: 70, zIndex: 100 },
        opacity: 0.9
      }
    ]
  }
];

interface SceneTemplatesProps {
  streamId: string;
  onClose: () => void;
  onTemplateApplied: () => void;
}

const SceneTemplates: React.FC<SceneTemplatesProps> = ({ streamId, onClose, onTemplateApplied }) => {
  const applyTemplate = async (template: Template) => {
    try {
      // Criar nova cena
      const { data: scene, error: sceneError } = await supabase
        .from('stream_scenes')
        .insert({
          stream_id: streamId,
          name: template.name,
          description: template.description,
          is_active: false,
          layout_config: {}
        })
        .select()
        .single();

      if (sceneError) throw sceneError;

      // Adicionar todas as fontes da template
      const sourcesToInsert = template.sources.map(source => ({
        scene_id: scene.id,
        type: source.type,
        name: source.name,
        url: null, // Usuário precisará adicionar as imagens
        content: source.content,
        position: source.position,
        is_visible: true,
        opacity: source.opacity,
        transform: {},
        animation: {}
      }));

      const { error: sourcesError } = await supabase
        .from('stream_sources')
        .insert(sourcesToInsert);

      if (sourcesError) throw sourcesError;

      toast.success(`✨ Template "${template.name}" aplicado com sucesso!`);
      onTemplateApplied();
      onClose();
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      toast.error('Erro ao aplicar template');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-400" size={24} />
            <div>
              <h3 className="text-white font-bold text-lg">Templates de Cenas</h3>
              <p className="text-slate-300 text-sm">Crie cenas profissionais rapidamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-purple-500 transition-all cursor-pointer group"
              onClick={() => applyTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{template.icon}</div>
                <Copy size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
              </div>
              
              <h4 className="text-white font-bold mb-1">{template.name}</h4>
              <p className="text-slate-300 text-sm mb-3">{template.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">
                  {template.sources.length} fontes
                </span>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-all">
                  Aplicar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <div className="border-t border-slate-700 p-4 bg-slate-900/50">
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <Sparkles size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Dica:</strong> Após aplicar um template, você precisará adicionar as imagens 
              dos patrocinadores e logos. Clique duas vezes em cada fonte para editar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneTemplates;
