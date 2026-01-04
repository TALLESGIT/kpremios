# 🔧 CORREÇÃO - Erro no ZK Studio LiveKit

## ❌ ERRO ATUAL

```
[LiveKitService] ❌ Erro na resposta do Supabase: 400 {"error":"room and role are required"}
```

## 🔍 CAUSA

O ZK Studio está chamando a Edge Function `livekit-token` **sem enviar** os parâmetros obrigatórios `room` e `role` no body da requisição.

## ✅ SOLUÇÃO

### No arquivo `livekitService.ts` do ZK Studio:

**ANTES (ERRADO):**
```typescript
// ❌ Chamada sem body
const response = await fetch(`${supabaseUrl}/functions/v1/livekit-token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
  // ❌ FALTANDO: body com room e role
});
```

**DEPOIS (CORRETO):**
```typescript
// ✅ Chamada com body completo
const response = await fetch(`${supabaseUrl}/functions/v1/livekit-token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({
    room: 'zktv',        // ✅ Nome da sala (ou channel_name da live)
    role: 'admin'        // ✅ Role: 'admin' para broadcaster
  })
});
```

## 📝 CÓDIGO COMPLETO CORRIGIDO

### Função `fetchToken` no ZK Studio:

```typescript
async fetchToken(room: string = 'zktv', role: 'admin' | 'reporter' | 'viewer' = 'admin'): Promise<string> {
  try {
    const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
    const supabaseAnonKey = 'SUA_ANON_KEY_AQUI'; // Obter do Supabase Dashboard

    console.log('[LiveKitService] 🎫 Buscando token no Supabase:', { room, role });

    const response = await fetch(`${supabaseUrl}/functions/v1/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        room: room,      // ✅ OBRIGATÓRIO
        role: role       // ✅ OBRIGATÓRIO
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[LiveKitService] ❌ Erro na resposta do Supabase:', response.status, errorData);
      throw new Error(`Falha ao buscar token: ${response.status}`);
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
```

### Função `startStream` no ZK Studio:

```typescript
async startStream(room: string = 'zktv'): Promise<void> {
  try {
    console.log('[LiveKitService] 🚀 Iniciando Transmissão...');
    
    // ✅ OBTER TOKEN COM ROOM E ROLE
    const token = await this.fetchToken(room, 'admin');
    
    // Conectar ao LiveKit
    const livekitUrl = 'wss://zkoficial-6xokn1hv.livekit.cloud';
    await this.room.connect(livekitUrl, token);
    
    // Publicar tracks
    // ... resto do código
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao iniciar:', error);
    throw error;
  }
}
```

## 🎯 PONTOS IMPORTANTES

1. **Room:** Use o `channel_name` da live (ex: `'zktv'` ou `'cruzeiro-x-santos'`)
2. **Role:** Use `'admin'` para o ZK Studio (broadcaster)
3. **Body:** Sempre envie como JSON stringificado
4. **Headers:** Inclua `Authorization` e `apikey` com a anon key do Supabase

## 🔑 ONDE OBTER A SUPABASE ANON KEY

1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api
2. Copie a **"anon public"** key
3. Use no código do ZK Studio

## ✅ TESTE RÁPIDO

Após corrigir, teste no console do ZK Studio:

```typescript
// Deve retornar um token JWT
const token = await fetchToken('zktv', 'admin');
console.log('Token:', token);
```

## 📋 CHECKLIST

- [ ] Adicionar `body: JSON.stringify({ room, role })` na chamada fetch
- [ ] Verificar que `room` está sendo passado corretamente
- [ ] Verificar que `role` está como `'admin'`
- [ ] Incluir headers `Authorization` e `apikey`
- [ ] Testar a chamada e verificar se retorna token

---

**Após essas correções, o erro 400 deve desaparecer!** ✅

