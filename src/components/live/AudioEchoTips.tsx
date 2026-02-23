import React, { useState } from 'react';
import { Headphones, ChevronDown, ChevronUp, Volume2, Mic } from 'lucide-react';

/**
 * Card de dicas profissionais para evitar eco quando o admin ativa o áudio na transmissão.
 * O eco ocorre quando: microfone captura o áudio das caixas de som → retorno na live → ouvido pelos espectadores.
 */
const AudioEchoTips: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tips = [
    {
      icon: Headphones,
      title: 'Use fones de ouvido',
      text: 'O mais importante: use fones ao transmitir com áudio. Assim seu microfone não captura o que está saindo dos alto-falantes.',
    },
    {
      icon: Volume2,
      title: 'Evite caixas de som',
      text: 'Nunca transmita com áudio usando caixas de som ligadas. O microfone captura o áudio e cria eco para todos os espectadores.',
    },
    {
      icon: Mic,
      title: 'Posicione o microfone',
      text: 'Mantenha o microfone afastado de monitores e caixas. Se usar monitor de áudio, utilize fones para ouvir.',
    },
  ];

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-amber-500/20 rounded-2xl overflow-hidden shadow-lg shadow-amber-500/5">
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Evite eco na transmissão
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dicas profissionais de áudio para transmissões ao vivo
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 text-slate-500 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-white/5">
          <div className="space-y-4 pt-4">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <tip.icon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{tip.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
            O preview desta página está com áudio mutado automaticamente para evitar eco. Os espectadores ouvem o áudio do ZK Studio/OBS.
          </p>
        </div>
      )}
    </div>
  );
};

export default AudioEchoTips;
