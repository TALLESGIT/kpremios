import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Save, Loader2, RefreshCw, AlertCircle, Info, Search, Filter, 
  MapPin, Zap, CheckCircle2, Globe, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ShippingRate {
  id: string;
  state_code: string;
  base_cost: number;
  estimated_days: number;
}

interface StateData {
  code: string;
  name: string;
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
}

const STATES_DATA: StateData[] = [
  { code: 'AC', name: 'Acre', region: 'Norte' },
  { code: 'AL', name: 'Alagoas', region: 'Nordeste' },
  { code: 'AP', name: 'Amapá', region: 'Norte' },
  { code: 'AM', name: 'Amazonas', region: 'Norte' },
  { code: 'BA', name: 'Bahia', region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', region: 'Nordeste' },
  { code: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste' },
  { code: 'ES', name: 'Espírito Santo', region: 'Sudeste' },
  { code: 'GO', name: 'Goiás', region: 'Centro-Oeste' },
  { code: 'MA', name: 'Maranhão', region: 'Nordeste' },
  { code: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  { code: 'MG', name: 'Minas Gerais', region: 'Sudeste' },
  { code: 'PA', name: 'Pará', region: 'Norte' },
  { code: 'PB', name: 'Paraíba', region: 'Nordeste' },
  { code: 'PR', name: 'Paraná', region: 'Sul' },
  { code: 'PE', name: 'Pernambuco', region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', region: 'Nordeste' },
  { code: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste' },
  { code: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste' },
  { code: 'RS', name: 'Rio Grande do Sul', region: 'Sul' },
  { code: 'RO', name: 'Rondônia', region: 'Norte' },
  { code: 'RR', name: 'Roraima', region: 'Norte' },
  { code: 'SC', name: 'Santa Catarina', region: 'Sul' },
  { code: 'SP', name: 'São Paulo', region: 'Sudeste' },
  { code: 'SE', name: 'Sergipe', region: 'Nordeste' },
  { code: 'TO', name: 'Tocantins', region: 'Norte' },
];

const REGIONAL_REFERENCES = {
  'Sudeste': { cost: 22, days: 4, desc: 'SP, RJ, MG, ES' },
  'Sul': { cost: 30, days: 7, desc: 'PR, SC, RS' },
  'Centro-Oeste': { cost: 35, days: 8, desc: 'DF, GO, MS, MT' },
  'Nordeste': { cost: 45, days: 12, desc: 'BA, CE, PE, RN, PB, AL, SE, MA, PI' },
  'Norte': { cost: 60, days: 18, desc: 'AM, PA, AC, RO, RR, AP, TO' },
};

export function ShippingRatesPanel() {
  const [rates, setRates] = useState<Record<string, Partial<ShippingRate>>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('Todas');

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
      // Update local state to mark as configured
      setRates(prev => ({
        ...prev,
        [stateCode]: { ...prev[stateCode], id: 'temp-id' } 
      }));
    } catch (error) {
      console.error('Erro ao salvar frete:', error);
      toast.error(`Erro ao salvar frete para ${stateCode}`);
    } finally {
      setIsSaving(null);
    }
  };

  const handleBulkApply = async (region: string) => {
    const ref = REGIONAL_REFERENCES[region as keyof typeof REGIONAL_REFERENCES];
    if (!ref) return;

    if (!confirm(`Deseja aplicar o custo de R$ ${ref.cost},00 e prazo de ${ref.days} dias para TODOS os estados da região ${region}?`)) return;

    setIsBulkSaving(true);
    try {
      const statesInRegion = STATES_DATA.filter(s => s.region === region);
      const updates = statesInRegion.map(s => ({
        state_code: s.code,
        base_cost: ref.cost,
        estimated_days: ref.days
      }));

      const { error } = await supabase
        .from('shipping_rates')
        .upsert(updates, { onConflict: 'state_code' });

      if (error) throw error;
      toast.success(`Região ${region} atualizada com sucesso!`);
      fetchRates();
    } catch (error) {
      console.error('Erro no bulk apply:', error);
      toast.error('Erro ao realizar atualização em massa');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleInputChange = (stateCode: string, field: keyof ShippingRate, value: string) => {
    setRates(prev => ({
      ...prev,
      [stateCode]: {
        ...prev[stateCode],
        [field]: value === '' ? undefined : (field === 'base_cost' ? parseFloat(value) : parseInt(value))
      }
    }));
  };

  const filteredStates = useMemo(() => {
    return STATES_DATA.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion === 'Todas' || s.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion]);

  const regions = ['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/10 border border-amber-400/20">
            <Truck className="w-7 h-7 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">
              Tabela de Frete Nacional
            </h3>
            <p className="text-slate-400 text-sm font-medium">Configure custos e prazos de entrega para os 27 estados</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px] xl:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Buscar estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl text-white text-sm focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center bg-slate-900/50 p-1 rounded-2xl border border-white/5">
            <Filter className="w-4 h-4 text-slate-500 ml-3 mr-2" />
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent text-white text-xs font-bold uppercase tracking-widest outline-none pr-8 py-2 appearance-none cursor-pointer"
            >
              {regions.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
            </select>
          </div>

          <button
            onClick={() => setShowReferences(!showReferences)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${showReferences ? 'bg-amber-600/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
          >
            <Zap className="w-4 h-4" />
            Sugestões
          </button>

          <button
            onClick={fetchRates}
            disabled={loading}
            className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Suggested References Panel */}
      <AnimatePresence>
        {showReferences && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-amber-600/10 to-amber-600/5 border border-amber-500/20 rounded-[2.5rem] p-8 relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Globe className="w-32 h-32 text-amber-500" />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Zap className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h4 className="text-white font-black uppercase italic tracking-tight text-lg">Valores de Mercado Sugeridos</h4>
                  <p className="text-blue-400/80 text-[10px] font-bold uppercase tracking-widest">Baseado em envios padrão (Correios PAC) saindo do polo logístico (Sudeste)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(REGIONAL_REFERENCES).map(([region, info]) => (
                  <div key={region} className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">{region}</p>
                      <MapPin className="w-3 h-3 text-amber-500/50" />
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] text-slate-500 uppercase font-black">Custo</span>
                        <span className="text-white font-black text-sm">R$ {info.cost},00</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] text-slate-500 uppercase font-black">Prazo</span>
                        <span className="text-blue-200 font-bold text-xs">{info.days} dias</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBulkApply(region)}
                      disabled={isBulkSaving}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      {isBulkSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Aplicar Tudo'}
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex items-center gap-3 p-4 bg-black/20 rounded-2xl border border-white/5">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-[10px] text-slate-500 italic">
                  Utilize o botão <span className="text-blue-400 font-bold">"Aplicar Tudo"</span> para configurar rapidamente todos os estados de uma região com valores justos de mercado.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid of States */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 bg-slate-900/30 rounded-[3rem] border border-white/5">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
            <Truck className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando tabelas com o banco de dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredStates.map((state) => {
              const currentRate = rates[state.code];
              const isConfigured = !!currentRate?.id;
              
              return (
                <motion.div
                  layout
                  key={state.code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`relative group bg-slate-800/40 border rounded-[2.5rem] p-7 transition-all duration-500 hover:bg-slate-800/60 ${isConfigured ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-white/5 hover:border-blue-500/20'}`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-7 right-7">
                    {isConfigured ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Ativo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pendente</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-5 mb-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-lg transition-transform group-hover:scale-110 duration-500 ${isConfigured ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/10' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-slate-400 border border-white/5'}`}>
                      {state.code}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white italic uppercase tracking-tight group-hover:text-amber-400 transition-colors">
                        {state.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{state.region}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Brasil</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 mb-8">
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        Taxa Base
                        <Info className="w-3 h-3 text-slate-600" />
                      </label>
                      <div className="relative group/input">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold font-mono">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={currentRate?.base_cost ?? ''}
                          placeholder="0,00"
                          onChange={(e) => handleInputChange(state.code, 'base_cost', e.target.value)}
                          className="w-full pl-10 pr-4 py-4 bg-black/60 border border-white/5 rounded-2xl text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all group-hover/input:border-white/10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        Estimativa
                        <Info className="w-3 h-3 text-slate-600" />
                      </label>
                      <div className="relative group/input">
                        <input
                          type="number"
                          value={currentRate?.estimated_days ?? ''}
                          placeholder="D"
                          onChange={(e) => handleInputChange(state.code, 'estimated_days', e.target.value)}
                          className="w-full px-4 py-4 bg-black/60 border border-white/5 rounded-2xl text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all group-hover/input:border-white/10 text-center"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black uppercase">Dias</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpdateRate(state.code)}
                    disabled={isSaving === state.code}
                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg ${isConfigured ? 'bg-white/5 hover:bg-emerald-600 text-white hover:shadow-emerald-600/20' : 'bg-amber-600 hover:bg-amber-500 text-black shadow-amber-600/20'}`}
                  >
                    {isSaving === state.code ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isConfigured ? 'Atualizar Taxa' : 'Salvar Configuração'}
                      </>
                    )}
                  </button>

                  {!isConfigured && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center mt-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider italic"
                    >
                      Aguardando definição inicial
                    </motion.p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/40 rounded-[3rem] border border-white/5 border-dashed">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-slate-600" />
          </div>
          <h4 className="text-white font-black uppercase italic text-lg mb-2">Estado não encontrado</h4>
          <p className="text-slate-500 text-xs font-bold">Verifique o termo de busca ou o filtro de região</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedRegion('Todas'); }}
            className="mt-6 flex items-center gap-2 text-blue-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            Limpar Filtros
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : null}

      {/* Footer Info Box */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-7 h-7 text-amber-500" />
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h5 className="text-amber-500 font-black text-sm uppercase italic tracking-tight mb-2">Observação sobre Frete Grátis</h5>
          <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-3xl">
            Se você ativar o <span className="text-white font-bold">Frete Grátis</span> nas configurações de um produto específico para um determinado estado, as taxas definidas aqui serão ignoradas para aquele produto. Caso o carrinho contenha um produto que NÃO possua frete grátis, o valor base configurado aqui será aplicado.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-4 bg-black/40 px-6 py-4 rounded-3xl border border-white/5">
          <div className="text-center">
            <p className="text-white font-black text-lg leading-none">27</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">UFs Totais</p>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-emerald-400 font-black text-lg leading-none">{Object.keys(rates).length}</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">Configurados</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
