/**
 * 🔧 CORREÇÃO PARA ZK STUDIO - LiveKit Token
 * 
 * Substitua a função fetchToken no seu livekitService.ts do ZK Studio
 * por este código corrigido.
 */

// ✅ CÓDIGO CORRIGIDO - Função fetchToken
async fetchToken(room: string = 'zktv', role: 'admin' | 'reporter' | 'viewer' = 'admin'): Promise<string> {
  try {
    // ⚙️ CONFIGURAÇÕES - Ajuste conforme necessário
    const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
    const supabaseAnonKey = 'SUA_ANON_KEY_AQUI'; // ⚠️ SUBSTITUA pela sua anon key do Supabase

    console.log('[LiveKitService] 🎫 Buscando token no Supabase:', { room, role });

    // ✅ REQUISIÇÃO CORRETA - Com body incluindo room e role
    const response = await fetch(`${supabaseUrl}/functions/v1/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      // ✅ CORREÇÃO: Adicionar body com room e role
      body: JSON.stringify({
        room: room,      // Nome da sala (ex: 'zktv', 'cruzeiro-x-santos')
        role: role       // Role: 'admin' para broadcaster
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[LiveKitService] ❌ Erro na resposta do Supabase:', response.status, errorData);
      throw new Error(`Falha ao buscar token: ${response.status} - ${errorData.error || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.token) {
      throw new Error('Token não retornado na resposta');
    }

    console.log('[LiveKitService] ✅ Token obtido com sucesso');
    return data.token;

  } catch (error: any) {
    console.error('[LiveKitService] ❌ Falha crítica no fetchToken:', error);
    throw error;
  }
}

// ✅ EXEMPLO DE USO na função startStream
async startStream(room: string = 'zktv'): Promise<void> {
  try {
    console.log('[LiveKitService] 🚀 Iniciando Transmissão...');
    
    // ✅ Chamar fetchToken com room e role
    const token = await this.fetchToken(room, 'admin');
    
    // Conectar ao LiveKit
    const livekitUrl = 'wss://zkoficial-6xokn1hv.livekit.cloud';
    await this.room.connect(livekitUrl, token);
    
    // ... resto do código de publicação de tracks
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao iniciar:', error);
    throw error;
  }
}

/**
 * 📋 CHECKLIST DE CORREÇÃO:
 * 
 * 1. ✅ Adicionar body: JSON.stringify({ room, role }) na chamada fetch
 * 2. ✅ Verificar que room está sendo passado (ex: 'zktv')
 * 3. ✅ Verificar que role está como 'admin' para broadcaster
 * 4. ✅ Incluir headers Authorization e apikey
 * 5. ✅ Obter anon key do Supabase Dashboard
 * 
 * 🔑 ONDE OBTER A ANON KEY:
 * https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api
 * Copie a "anon public" key
 */

