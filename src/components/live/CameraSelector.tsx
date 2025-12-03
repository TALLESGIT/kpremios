import React, { useState, useEffect } from 'react';
import { Video, RefreshCw, Check } from 'lucide-react';

interface CameraDevice {
  deviceId: string;
  label: string;
  isOBS: boolean;
}

interface CameraSelectorProps {
  onSelectCamera: (deviceId: string, label: string) => void;
  selectedDeviceId?: string;
}

const CameraSelector: React.FC<CameraSelectorProps> = ({ 
  onSelectCamera, 
  selectedDeviceId 
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCameras = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Solicitar permissão primeiro com resolução ideal 1080p60
      await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 }
        }
      });
      
      // Listar dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Câmera ${device.deviceId.substring(0, 8)}`,
          isOBS: device.label.toLowerCase().includes('obs') || 
                 device.label.toLowerCase().includes('virtual')
        }))
        .sort((a, b) => {
          // OBS Virtual Camera primeiro
          if (a.isOBS && !b.isOBS) return -1;
          if (!a.isOBS && b.isOBS) return 1;
          return a.label.localeCompare(b.label);
        });
      
      setCameras(videoDevices);
      
      // Se há câmera selecionada, notificar o componente pai sobre o label
      if (selectedDeviceId && videoDevices.length > 0) {
        const selectedCamera = videoDevices.find(c => c.deviceId === selectedDeviceId);
        if (selectedCamera) {
          // Notificar sobre a câmera já selecionada (sem mostrar toast)
          onSelectCamera(selectedDeviceId, selectedCamera.label);
        }
      }
      // Se não há câmera selecionada e há OBS Virtual Camera, selecionar automaticamente
      else if (!selectedDeviceId && videoDevices.length > 0) {
        const obsCamera = videoDevices.find(c => c.isOBS);
        if (obsCamera) {
          onSelectCamera(obsCamera.deviceId, obsCamera.label);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar câmeras:', err);
      setError('Não foi possível acessar as câmeras. Verifique as permissões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-sm flex items-center gap-2">
          <Video size={16} />
          Selecionar Câmera
        </h4>
        <button
          onClick={loadCameras}
          disabled={loading}
          className="text-amber-400 hover:text-amber-300 transition-colors p-1"
          title="Atualizar lista de câmeras"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2 rounded">
          {error}
        </div>
      )}

      {loading && cameras.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-4">
          Carregando câmeras...
        </div>
      ) : cameras.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-4">
          Nenhuma câmera encontrada
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {cameras.map((camera) => (
            <button
              key={camera.deviceId}
              onClick={() => onSelectCamera(camera.deviceId, camera.label)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedDeviceId === camera.deviceId
                  ? 'bg-amber-500/20 border-amber-500'
                  : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Video size={16} className={camera.isOBS ? 'text-purple-400' : 'text-slate-400'} />
                  <span className="text-white text-sm truncate">
                    {camera.label}
                  </span>
                  {camera.isOBS && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded font-bold flex-shrink-0">
                      OBS
                    </span>
                  )}
                </div>
                {selectedDeviceId === camera.deviceId && (
                  <Check size={16} className="text-amber-400 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {cameras.length > 0 && (
        <div className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
          <p className="font-semibold mb-1">💡 Dica:</p>
          <p>
            Para usar OBS Studio: Inicie a "Câmera Virtual" no OBS antes de iniciar a transmissão.
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraSelector;

