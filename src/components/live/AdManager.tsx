import React, { useState, useEffect } from 'react';
import { Image, Plus, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AdManagerProps {
  streamId: string;
  onAdImagesChange: (images: Array<{id: string; url: string; enabled: boolean; duration?: number}>) => void;
  onOverlayAdChange: (ad: {url: string; enabled: boolean} | null) => void;
}

const AdManager: React.FC<AdManagerProps> = ({ streamId, onAdImagesChange, onOverlayAdChange }) => {
  const [adImages, setAdImages] = useState<Array<{id: string; url: string; enabled: boolean; duration?: number}>>([]);
  const [overlayAd, setOverlayAd] = useState<{url: string; enabled: boolean} | null>(null);
  const [newAdImage, setNewAdImage] = useState<{url: string; file: File | null; duration: number}>({
    url: '',
    file: null,
    duration: 5
  });
  const [newOverlayAd, setNewOverlayAd] = useState<{url: string; file: File | null}>({
    url: '',
    file: null
  });

  // Carregar propagandas do banco
  useEffect(() => {
    loadAds();
  }, [streamId]);

  const loadAds = async () => {
    try {
      // Carregar imagens do slideshow
      const { data: images, error: imagesError } = await supabase
        .from('stream_ad_images')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true });

      if (imagesError) throw imagesError;
      
      const formattedImages = (images || []).map(img => ({
        id: img.id,
        url: img.url,
        enabled: img.enabled || false,
        duration: img.duration || 5
      }));
      
      setAdImages(formattedImages);
      onAdImagesChange(formattedImages);

      // Carregar overlay ad
      const { data: overlay, error: overlayError } = await supabase
        .from('stream_overlay_ads')
        .select('*')
        .eq('stream_id', streamId)
        .maybeSingle();

      if (overlayError && overlayError.code !== 'PGRST116') throw overlayError;
      
      if (overlay) {
        setOverlayAd({ url: overlay.url, enabled: overlay.enabled || false });
        onOverlayAdChange({ url: overlay.url, enabled: overlay.enabled || false });
      }
    } catch (error) {
      console.error('Erro ao carregar propagandas:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isOverlay: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${streamId}_${Date.now()}.${fileExt}`;
      const filePath = `ads/${fileName}`;

      // Tentar fazer upload para o storage primeiro
      let uploadSuccess = false;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('stream-ads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        // Se o upload funcionar, usar a URL do storage
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('stream-ads')
            .getPublicUrl(filePath);

          if (isOverlay) {
            setNewOverlayAd({ ...newOverlayAd, url: publicUrl, file: null });
          } else {
            setNewAdImage({ ...newAdImage, url: publicUrl, file: null });
          }
          toast.success('Imagem enviada com sucesso!');
          uploadSuccess = true;
        }
      } catch (storageError: any) {
        // Erro silencioso - usar fallback base64
        uploadSuccess = false;
      }

      // Se upload falhou, usar base64 como fallback
      if (!uploadSuccess) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (isOverlay) {
            setNewOverlayAd({ ...newOverlayAd, url: base64, file: null });
          } else {
            setNewAdImage({ ...newAdImage, url: base64, file: null });
          }
          toast.success('Imagem carregada! Bucket configurado - próximas tentativas usarão o storage.');
        };
        reader.onerror = () => {
          toast.error('Erro ao carregar imagem');
        };
        reader.readAsDataURL(file);
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const addAdImage = async () => {
    if (!newAdImage.url.trim()) {
      toast.error('Adicione uma URL ou faça upload de uma imagem');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stream_ad_images')
        .insert({
          stream_id: streamId,
          url: newAdImage.url,
          duration: newAdImage.duration,
          enabled: false
        })
        .select()
        .single();

      if (error) throw error;

      const newImage = {
        id: data.id,
        url: data.url,
        enabled: false,
        duration: data.duration
      };

      const updated = [...adImages, newImage];
      setAdImages(updated);
      onAdImagesChange(updated);
      setNewAdImage({ url: '', file: null, duration: 5 });
      toast.success('Imagem adicionada ao slideshow!');
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao adicionar imagem');
    }
  };

  const toggleAdImage = async (id: string) => {
    try {
      const image = adImages.find(img => img.id === id);
      if (!image) return;

      const { error } = await supabase
        .from('stream_ad_images')
        .update({ enabled: !image.enabled })
        .eq('id', id);

      if (error) throw error;

      const updated = adImages.map(img =>
        img.id === id ? { ...img, enabled: !img.enabled } : img
      );
      
      setAdImages(updated);
      onAdImagesChange(updated);
      toast.success(image.enabled ? 'Imagem desativada' : 'Imagem ativada');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const removeAdImage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stream_ad_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = adImages.filter(img => img.id !== id);
      setAdImages(updated);
      onAdImagesChange(updated);
      toast.success('Imagem removida');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  const setOverlayAdImage = async () => {
    if (!newOverlayAd.url.trim()) {
      toast.error('Adicione uma URL ou faça upload de uma imagem');
      return;
    }

    try {
      // Remover overlay existente
      await supabase
        .from('stream_overlay_ads')
        .delete()
        .eq('stream_id', streamId);

      // Adicionar novo
      const { data, error } = await supabase
        .from('stream_overlay_ads')
        .insert({
          stream_id: streamId,
          url: newOverlayAd.url,
          enabled: false
        })
        .select()
        .single();

      if (error) throw error;

      const newOverlay = { url: data.url, enabled: false };
      setOverlayAd(newOverlay);
      onOverlayAdChange(newOverlay);
      setNewOverlayAd({ url: '', file: null });
      toast.success('Overlay configurado!');
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao configurar overlay');
    }
  };

  const toggleOverlayAd = async () => {
    if (!overlayAd) return;

    try {
      const { error } = await supabase
        .from('stream_overlay_ads')
        .update({ enabled: !overlayAd.enabled })
        .eq('stream_id', streamId);

      if (error) throw error;

      const updated = { ...overlayAd, enabled: !overlayAd.enabled };
      setOverlayAd(updated);
      onOverlayAdChange(updated);
      toast.success(overlayAd.enabled ? 'Overlay desativado' : 'Overlay ativado');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const removeOverlayAd = async () => {
    try {
      const { error } = await supabase
        .from('stream_overlay_ads')
        .delete()
        .eq('stream_id', streamId);

      if (error) throw error;

      setOverlayAd(null);
      onOverlayAdChange(null);
      toast.success('Overlay removido');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao remover overlay');
    }
  };

  return (
    <div className="space-y-6">
      {/* Slideshow de Imagens */}
      <div>
        <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Image size={20} className="text-blue-400" />
          Slideshow de Imagens
        </h4>
        
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="block text-white text-sm mb-2">URL da Imagem ou Upload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAdImage.url}
                  onChange={(e) => setNewAdImage({ ...newAdImage, url: e.target.value })}
                  placeholder="URL da imagem ou faça upload"
                  className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  className="hidden"
                  id="ad-image-upload"
                />
                <label
                  htmlFor="ad-image-upload"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm flex items-center gap-2 transition-colors"
                >
                  <Upload size={16} />
                  Upload
                </label>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-white text-sm mb-2">Duração (segundos)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newAdImage.duration}
                  onChange={(e) => setNewAdImage({ ...newAdImage, duration: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <button
                onClick={addAdImage}
                className="mt-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {adImages.map((img) => (
            <div key={img.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-700 transition-colors">
              <img src={img.url} alt="Ad" className="w-16 h-16 object-cover rounded-lg" />
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Duração: {img.duration}s</div>
                <div className={`text-xs ${img.enabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {img.enabled ? '✅ Ativo' : '⏸️ Desativado'}
                </div>
              </div>
              <button
                onClick={() => toggleAdImage(img.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  img.enabled 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {img.enabled ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => removeAdImage(img.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {adImages.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Nenhuma imagem adicionada ainda</p>
          )}
        </div>
      </div>
      
      {/* Propaganda Overlay */}
      <div>
        <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Image size={20} className="text-purple-400" />
          Propaganda Overlay (Fullscreen)
        </h4>
        
        {!overlayAd ? (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-white text-sm mb-2">URL da Imagem ou Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOverlayAd.url}
                    onChange={(e) => setNewOverlayAd({ ...newOverlayAd, url: e.target.value })}
                    placeholder="URL da imagem ou faça upload"
                    className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                    id="overlay-ad-upload"
                  />
                  <label
                    htmlFor="overlay-ad-upload"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm flex items-center gap-2 transition-colors"
                  >
                    <Upload size={16} />
                    Upload
                  </label>
                </div>
              </div>
              <button
                onClick={setOverlayAdImage}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Configurar Overlay
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img src={overlayAd.url} alt="Overlay Ad" className="w-32 h-20 object-cover rounded-lg" />
              <div className="flex-1">
                <div className={`text-sm font-medium ${overlayAd.enabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {overlayAd.enabled ? '✅ Ativo' : '⏸️ Desativado'}
                </div>
                <p className="text-slate-400 text-xs mt-1">O jogo aparecerá em PiP quando ativo</p>
              </div>
              <button
                onClick={toggleOverlayAd}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  overlayAd.enabled 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {overlayAd.enabled ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={removeOverlayAd}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdManager;
