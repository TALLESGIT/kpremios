import React, { useState } from 'react';
import { HelpCircle, X, Keyboard, Video, Layers, Zap } from 'lucide-react';

interface QuickTutorialProps {
  onClose: () => void;
}

const QuickTutorial: React.FC<QuickTutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '🎬 Bem-vindo ao Stream Studio',
      icon: <Layers size={48} className="text-purple-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-slate-300">
            O Stream Studio é seu controle profissional de transmissão, similar ao OBS Studio.
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">O que você pode fazer:</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>✅ Criar múltiplas cenas para diferentes momentos</li>
              <li>✅ Adicionar logos, textos, placares e patrocinadores</li>
              <li>✅ Posicionar elementos com drag-and-drop</li>
              <li>✅ Alternar cenas durante a transmissão</li>
              <li>✅ Controlar tudo em tempo real</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: '🎯 Passo 1: Criar Cenas',
      icon: <Layers size={48} className="text-amber-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Cenas são como "telas" diferentes da sua transmissão.
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">Como criar:</p>
            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
              <li>No painel lateral, seção <strong>CENAS</strong></li>
              <li>Clique no ícone <strong>+</strong></li>
              <li>Digite um nome (ex: "Durante o Jogo")</li>
              <li>Clique em <strong>Criar</strong></li>
            </ol>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-300 text-sm">
              💡 <strong>Ou use Templates:</strong> Clique no ícone 📋 para aplicar cenas prontas!
            </p>
          </div>
        </div>
      )
    },
    {
      title: '🖼️ Passo 2: Adicionar Fontes',
      icon: <Video size={48} className="text-blue-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Fontes são os elementos que aparecem na tela (logos, textos, placar).
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">Como adicionar:</p>
            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
              <li><strong>Selecione uma cena</strong> (clique nela)</li>
              <li>Clique no botão <strong>"Biblioteca"</strong></li>
              <li><strong>Clique no card</strong> desejado (Logo, Placar, etc)</li>
              <li>Fonte é adicionada automaticamente!</li>
            </ol>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              💡 <strong>Dica:</strong> Duplo clique na fonte para editar e fazer upload de imagens!
            </p>
          </div>
        </div>
      )
    },
    {
      title: '🎨 Passo 3: Posicionar e Ajustar',
      icon: <Zap size={48} className="text-green-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Use drag-and-drop para posicionar suas fontes perfeitamente.
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">Controles:</p>
            <ul className="text-slate-300 text-sm space-y-2">
              <li>🖱️ <strong>Arrastar:</strong> Clique e segure para mover</li>
              <li>📐 <strong>Redimensionar:</strong> Use os handles amarelos</li>
              <li>👁️ <strong>Visibilidade:</strong> Clique no olho para ocultar/mostrar</li>
              <li>✏️ <strong>Editar:</strong> Duplo clique para abrir editor completo</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: '⚡ Atalhos de Teclado',
      icon: <Keyboard size={48} className="text-cyan-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Use atalhos para trabalhar mais rápido!
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">G</kbd>
                <span className="text-slate-300 ml-2">Toggle Grid</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">S</kbd>
                <span className="text-slate-300 ml-2">Toggle Snap</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">Del</kbd>
                <span className="text-slate-300 ml-2">Deletar</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">Esc</kbd>
                <span className="text-slate-300 ml-2">Desselecionar</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">Enter</kbd>
                <span className="text-slate-300 ml-2">Editar</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">↑↓←→</kbd>
                <span className="text-slate-300 ml-2">Mover</span>
              </div>
              <div className="col-span-2">
                <kbd className="px-2 py-1 bg-slate-900 rounded text-amber-400 font-mono">Ctrl+D</kbd>
                <span className="text-slate-300 ml-2">Duplicar fonte</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '🚀 Enviar ao Vivo',
      icon: <Zap size={48} className="text-red-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Quando estiver pronto, envie sua cena para a transmissão!
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">Como fazer:</p>
            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
              <li>Configure tudo no <strong>Preview</strong> (canvas superior)</li>
              <li>Quando estiver perfeito, clique no botão verde:</li>
              <li className="ml-6">
                <div className="bg-green-600 text-white px-4 py-2 rounded inline-flex items-center gap-2 text-sm font-medium mt-2">
                  ↔️ Enviar ao PROGRAMA
                </div>
              </li>
              <li>Cena ativa aparece no <strong>PROGRAMA</strong> (canvas inferior)</li>
              <li>Aparece AO VIVO para todos os espectadores!</li>
            </ol>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              ⚠️ <strong>Durante a transmissão:</strong> Use o <strong>Painel de Controle AO VIVO</strong> 
              (canto da tela) para controles rápidos sem abrir o Studio!
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-purple-500/50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 rounded-t-2xl border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              <div>
                <h3 className="text-white font-bold text-xl">{currentStepData.title}</h3>
                <p className="text-slate-300 text-sm mt-1">
                  Passo {currentStep + 1} de {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStepData.content}
        </div>

        {/* Footer - Navigation */}
        <div className="bg-slate-900/50 p-4 rounded-b-2xl flex items-center justify-between border-t border-slate-700">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-purple-500 w-6'
                    : index < currentStep
                      ? 'bg-purple-500/50'
                      : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                ← Anterior
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-colors"
              >
                ✓ Entendi!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickTutorial;
