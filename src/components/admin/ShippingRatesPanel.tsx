import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, Save, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ShippingRate {
  id: string;
  state_code: string;
  base_cost: number;
  estimated_days: number;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ShippingRatesPanel() {
  const [rates, setRates] = useState<Record<string, Partial<ShippingRate>>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*');

      if (error) throw error;

      const ratesMap: Record<string, Partial<ShippingRate>> = {};
      data?.forEach(rate => {
        ratesMap[rate.state_code] = rate;
      });
      setRates(ratesMap);
    } catch (error: any) {
      console.error('Erro ao buscar taxas de frete:', error);
      toast.error('Erro ao carregar taxas de frete');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateRate = async (stateCode: string) => {
    const rate = rates[stateCode] || {};
    const baseCost = rate.base_cost !== undefined ? rate.base_cost : 35.00;
    const estimatedDays = rate.estimated_days !== undefined ? rate.estimated_days : 7;

    setIsSaving(stateCode);
    try {
      const { error } = await supabase
        .from('shipping_rates')
        .upsert({
          state_code: stateCode,
          base_cost: baseCost,
          estimated_days: estimatedDays
        }, { onConflict: 'state_code' });

      if (error) throw error;
      toast.success(`Frete para ${stateCode} atualizado!`);
      fetchRates();
    } catch (error) {
      console.error('Erro ao salvar frete:', error);
      toast.error(`Erro ao salvar frete para ${stateCode}`);
    } finally {
      setIsSaving(null);
    }
  };

  const handleInputChange = (stateCode: string, field: keyof ShippingRate, value: string) => {
    setRates(prev => ({
      ...prev,
      [stateCode]: {
        ...prev[stateCode],
        [field]: field === 'base_cost' ? parseFloat(value) : parseInt(value)
      }
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-500" />
            Configurações de Frete
          </h3>
          <p className="text-slate-400 text-sm mt-1">Defina o custo base e prazo estimado de entrega para cada estado do Brasil.</p>
        </div>
        
        <button
          onClick={fetchRates}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando tabelas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {BRAZILIAN_STATES.map((state) => (
            <motion.div
              layout
              key={state}
              className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 group hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-600/20 group-hover:bg-blue-600/20 transition-all">
                    <span className="text-blue-500 font-black italic">{state}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm uppercase">Estado: {state}</h4>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Brasil</span>
                  </div>
                </div>
                
                {rates[state]?.id && (
                  <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                    Configurado
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Custo Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rates[state]?.base_cost ?? ''}
                    placeholder="35,00"
                    onChange={(e) => handleInputChange(state, 'base_cost', e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-bold focus:border-blue-500/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Prazo (Dias)</label>
                  <input
                    type="number"
                    value={rates[state]?.estimated_days ?? ''}
                    placeholder="7"
                    onChange={(e) => handleInputChange(state, 'estimated_days', e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs font-bold focus:border-blue-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={() => handleUpdateRate(state)}
                disabled={isSaving === state}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving === state ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar Taxa
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
        <div>
          <h5 className="text-amber-500 font-bold text-sm uppercase italic tracking-tight">Dica Importante</h5>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Se você ativar o <span className="text-white font-bold">Frete Grátis</span> nas configurações de um produto específico para um determinado estado, as taxas definidas aqui serão ignoradas para aquele produto. Caso o carrinho contenha um produto que NÃO possua frete grátis, o valor base configurado aqui será aplicado.
          </p>
        </div>
      </div>
    </div>
  );
}
