import { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

/**
 * Página de Diagnóstico do Agora.io
 * 
 * Esta página ajuda a diagnosticar problemas de conexão com o Agora.io
 */
export default function DiagnosticoAgoraPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channelName, setChannelName] = useState('ZkPremios');
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  const testConnection = async () => {
    setIsConnecting(true);
    setLogs([]);
    
    const appId = import.meta.env.VITE_AGORA_APP_ID;
    const token = import.meta.env.VITE_AGORA_TOKEN || null;
    
    addLog('🔧 Iniciando diagnóstico...');
    addLog(`📋 App ID: ${appId?.substring(0, 8)}...`);
    addLog(`📋 Canal: ${channelName}`);
    addLog(`📋 Token: ${token ? 'Configurado' : 'Não configurado (App ID Only)'}`);
    
    if (!appId) {
      addLog('❌ ERRO: App ID não configurado!');
      setIsConnecting(false);
      return;
    }
    
    try {
      // Criar cliente
      addLog('🔨 Criando cliente Agora...');
      const client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'h264',
      });
      
      addLog('✅ Cliente criado com sucesso!');
      
      // Configurar role
      addLog('🎭 Configurando role como audience...');
      await client.setClientRole('audience', { level: 1 });
      addLog('✅ Role configurado!');
      
      // Event listeners
      client.on('connection-state-change', (curState, prevState, reason) => {
        addLog(`🔌 Estado de conexão: ${prevState} → ${curState} (${reason || 'sem motivo'})`);
      });
      
      client.on('user-published', async (user, mediaType) => {
        addLog(`📡 USER-PUBLISHED! UID: ${user.uid}, Tipo: ${mediaType}`);
        addLog(`   - hasVideo: ${user.hasVideo}`);
        addLog(`   - hasAudio: ${user.hasAudio}`);
        
        try {
          await client.subscribe(user, mediaType);
          addLog(`✅ Subscribe realizado em ${mediaType}!`);
        } catch (err: any) {
          addLog(`❌ Erro ao fazer subscribe: ${err.message}`);
        }
      });
      
      client.on('user-unpublished', (user, mediaType) => {
        addLog(`📴 USER-UNPUBLISHED! UID: ${user.uid}, Tipo: ${mediaType}`);
      });
      
      client.on('user-joined', (user) => {
        addLog(`👤 Usuário entrou no canal! UID: ${user.uid}`);
      });
      
      client.on('user-left', (user, reason) => {
        addLog(`👋 Usuário saiu do canal! UID: ${user.uid}, Motivo: ${reason}`);
      });
      
      // Conectar
      addLog(`🔌 Conectando ao canal "${channelName}"...`);
      await client.join(appId, channelName, token, null);
      addLog('✅ CONECTADO AO CANAL COM SUCESSO!');
      
      // Verificar usuários remotos
      const remoteUsers = client.remoteUsers;
      addLog(`👥 Usuários remotos no canal: ${remoteUsers.length}`);
      
      if (remoteUsers.length > 0) {
        remoteUsers.forEach((user, index) => {
          addLog(`   ${index + 1}. UID: ${user.uid}`);
          addLog(`      - hasVideo: ${user.hasVideo}`);
          addLog(`      - hasAudio: ${user.hasAudio}`);
        });
      } else {
        addLog('⚠️ Nenhum usuário remoto encontrado no canal.');
        addLog('   Isso significa que ninguém está transmitindo neste canal no momento.');
      }
      
      // Aguardar por eventos
      addLog('⏳ Aguardando eventos... (deixe esta página aberta)');
      
      // Cleanup após 60 segundos
      setTimeout(async () => {
        addLog('⏰ Tempo de diagnóstico encerrado (60s)');
        await client.leave();
        addLog('👋 Desconectado do canal');
        setIsConnecting(false);
      }, 60000);
      
    } catch (err: any) {
      addLog(`❌ ERRO: ${err.message || err}`);
      addLog(`   Código: ${err.code || 'N/A'}`);
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">
            🔍 Diagnóstico Agora.io
          </h1>
          <p className="text-slate-300 mb-6">
            Esta ferramenta ajuda a diagnosticar problemas de conexão com o Agora.io.
          </p>
          
          <div className="mb-4">
            <label className="block text-white mb-2">Nome do Canal:</label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-600 focus:border-purple-500 focus:outline-none"
              placeholder="ZkPremios"
              disabled={isConnecting}
            />
          </div>
          
          <button
            onClick={testConnection}
            disabled={isConnecting}
            className={`w-full py-3 rounded font-semibold transition-colors ${
              isConnecting
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isConnecting ? '🔄 Diagnosticando...' : '🚀 Iniciar Diagnóstico'}
          </button>
        </div>
        
        <div className="bg-black/50 backdrop-blur-md rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 Logs:</h2>
          <div className="bg-slate-900 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-slate-500">Aguardando diagnóstico...</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.includes('❌') || log.includes('ERRO')
                      ? 'text-red-400'
                      : log.includes('✅')
                      ? 'text-green-400'
                      : log.includes('⚠️')
                      ? 'text-yellow-400'
                      : log.includes('📡') || log.includes('USER-PUBLISHED')
                      ? 'text-blue-400 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">💡 Dicas:</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>• Certifique-se de que o ZK Studio Pro está transmitindo</li>
            <li>• Verifique se o nome do canal está correto (case-sensitive)</li>
            <li>• O App ID deve estar configurado no arquivo .env</li>
            <li>• Se usar token, certifique-se de que não está expirado</li>
            <li>• Aguarde pelo menos 10 segundos após iniciar a transmissão</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

