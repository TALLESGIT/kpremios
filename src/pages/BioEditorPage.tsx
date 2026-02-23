import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import {
  Link as LinkIcon,
  User as UserIcon,
  Palette,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BioLink, BioProfile } from '../types';

const BioEditorPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<BioProfile>>({
    slug: '',
    display_name: '',
    bio: '',
    custom_links: [],
    theme_config: {
      primaryColor: '#3b82f6',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      borderRadius: '12px',
      buttonStyle: 'solid'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bio_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading bio profile:', error);
      toast.error('Erro ao carregar perfil da bio');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.slug) {
      toast.error('O link da bio (slug) é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('bio_profiles')
        .upsert({
          ...profile,
          user_id: user?.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Perfil salvo com sucesso!');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Este link já está em uso por outro usuário');
      } else {
        toast.error('Erro ao salvar perfil');
      }
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    const newLink: BioLink = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'Novo Link',
      url: 'https://',
    };
    setProfile(prev => ({
      ...prev,
      custom_links: [...(prev.custom_links || []), newLink]
    }));
  };

  const updateLink = (id: string, updates: Partial<BioLink>) => {
    setProfile(prev => ({
      ...prev,
      custom_links: prev.custom_links?.map(link =>
        link.id === id ? { ...link, ...updates } : link
      )
    }));
  };

  const removeLink = (id: string) => {
    setProfile(prev => ({
      ...prev,
      custom_links: prev.custom_links?.filter(link => link.id !== id)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-blue-600" />
            Meu Link na Bio
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                <UserIcon className="h-5 w-5 text-blue-500" />
                Informações Básicas
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Link do Perfil (@)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">zkp.re/</span>
                    <input
                      type="text"
                      className="w-full pl-20 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all font-bold"
                      placeholder="seunome"
                      value={profile.slug}
                      onChange={e => setProfile(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">Use apenas letras, números, hífen e underline.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nome de Exibição</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all font-bold"
                    placeholder="Como você quer aparecer"
                    value={profile.display_name}
                    onChange={e => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Bio</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all font-medium"
                    placeholder="Uma breve descrição sobre você"
                    value={profile.bio}
                    onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                  <LinkIcon className="h-5 w-5 text-green-500" />
                  Links Personalizados
                </h2>
                <button
                  onClick={addLink}
                  className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {profile.custom_links?.map((link) => (
                  <div key={link.id} className="p-4 bg-gray-50 rounded-2xl space-y-3 relative group border-2 border-transparent hover:border-blue-100 transition-all">
                    <button
                      onClick={() => removeLink(link.id)}
                      className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm font-bold"
                        placeholder="Título do Link"
                        value={link.label}
                        onChange={e => updateLink(link.id, { label: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium"
                        placeholder="URL"
                        value={link.url}
                        onChange={e => updateLink(link.id, { url: e.target.value })}
                      />
                    </div>
                  </div>
                ))}

                {(!profile.custom_links || profile.custom_links.length === 0) && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-3xl">
                    <p className="text-gray-400 text-sm">Nenhum link adicionado ainda.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                <Palette className="h-5 w-5 text-purple-500" />
                Estilo e Cores
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Cor Primária</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 p-0 border-0 bg-transparent cursor-pointer rounded-lg"
                      value={profile.theme_config?.primaryColor}
                      onChange={e => setProfile(prev => ({
                        ...prev,
                        theme_config: { ...prev.theme_config, primaryColor: e.target.value }
                      }))}
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-1 bg-gray-50 text-sm font-mono rounded-xl border-gray-100"
                      value={profile.theme_config?.primaryColor}
                      onChange={e => setProfile(prev => ({
                        ...prev,
                        theme_config: { ...prev.theme_config, primaryColor: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Cor de Fundo</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 p-0 border-0 bg-transparent cursor-pointer rounded-lg"
                      value={profile.theme_config?.backgroundColor}
                      onChange={e => setProfile(prev => ({
                        ...prev,
                        theme_config: { ...prev.theme_config, backgroundColor: e.target.value }
                      }))}
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-1 bg-gray-50 text-sm font-mono rounded-xl border-gray-100"
                      value={profile.theme_config?.backgroundColor}
                      onChange={e => setProfile(prev => ({
                        ...prev,
                        theme_config: { ...prev.theme_config, backgroundColor: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Preview */}
          <div className="hidden lg:block sticky top-8 h-fit">
            <h2 className="text-sm font-black text-gray-400 uppercase mb-4 ml-1">Prévia do Celular</h2>
            <div className="w-[320px] h-[640px] bg-slate-800 rounded-[3rem] p-3 border-[6px] border-slate-700 shadow-2xl mx-auto overflow-hidden relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded-b-2xl z-20"></div>
              <div
                className="w-full h-full rounded-[2.2rem] overflow-y-auto overflow-x-hidden no-scrollbar p-6"
                style={{ backgroundColor: profile.theme_config?.backgroundColor }}
              >
                <div className="flex flex-col items-center text-center space-y-4 py-8">
                  <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-xl" style={{ color: profile.theme_config?.textColor }}>
                      {profile.display_name || 'Seu Nome'}
                    </h3>
                    <p className="text-sm opacity-70" style={{ color: profile.theme_config?.textColor }}>
                      {profile.bio || 'Sua bio aparecerá aqui'}
                    </p>
                  </div>

                  <div className="w-full space-y-3 pt-4">
                    {profile.custom_links?.map(link => (
                      <div
                        key={link.id}
                        className="w-full py-3 px-4 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform active:scale-95"
                        style={{
                          backgroundColor: profile.theme_config?.primaryColor,
                          color: '#fff',
                          borderRadius: profile.theme_config?.borderRadius
                        }}
                      >
                        {link.label}
                      </div>
                    ))}
                    {(!profile.custom_links || profile.custom_links.length === 0) && (
                      <div className="w-full py-12 border-2 border-dashed border-gray-200 rounded-3xl"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Footer with Save */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
        >
          {saving ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-5 w-5" />}
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default BioEditorPage;
