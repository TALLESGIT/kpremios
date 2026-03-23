import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Instagram, Youtube, Facebook, Music, Globe, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SocialSettingsPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    instagram: '',
    whatsapp: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) setSettings(data.value);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações sociais');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'social_links',
          value: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações sociais');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-white/10 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Redes Sociais</h2>
          <p className="text-slate-400 text-sm">Gerencie os links que aparecem no perfil dos usuários</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              Instagram
            </label>
            <input
              type="url"
              name="instagram"
              value={settings.instagram}
              onChange={handleChange}
              placeholder="https://instagram.com/perfil"
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-amber-500/50 focus:border-amber-500/50"
            />
          </div>


          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              WhatsApp (Link do Canal ou Perfil)
            </label>
            <input
              type="url"
              name="whatsapp"
              value={settings.whatsapp}
              onChange={handleChange}
              placeholder="https://wa.me/..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-amber-500/50 focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SocialSettingsPanel;
