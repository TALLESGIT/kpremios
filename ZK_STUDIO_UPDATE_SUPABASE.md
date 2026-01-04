# Atualização do Supabase - ZK Studio

## ⚠️ REGRA CRÍTICA

Use **SOMENTE** o `streamId` fornecido. **NÃO** buscar, criar ou atualizar múltiplas streams.

## 📝 Código Obrigatório

```typescript
/**
 * Atualiza o Supabase quando a transmissão inicia
 * @param streamId ID da stream no Supabase (OBRIGATÓRIO)
 * @param hlsUrl URL HLS final (.m3u8)
 */
async function notifySupabaseStreamStarted(streamId: string, hlsUrl: string) {
  // LOG OBRIGATÓRIO 1
  console.log(`Usando streamId: ${streamId}`);
  
  // LOG OBRIGATÓRIO 2
  console.log(`HLS URL FINAL: ${hlsUrl}`);
  
  // Atualizar SOMENTE com o streamId fornecido
  const { error } = await supabase
    .from('live_streams')
    .update({
      is_active: true,
      hls_url: hlsUrl,
      started_at: new Date().toISOString()
    })
    .eq('id', streamId);

  if (error) {
    console.error('❌ Erro ao atualizar Supabase:', error);
    throw error;
  }

  // LOG OBRIGATÓRIO 3
  console.log('Supabase atualizado com sucesso');
}
```

## 📋 Logs Obrigatórios (Ordem)

1. ✅ `"Usando streamId: {streamId}"`
2. ✅ `"HLS URL FINAL: {hlsUrl}"`
3. ✅ `"Supabase atualizado com sucesso"`

## ✅ Resultado Esperado

- ✅ O site passa a tocar o vídeo imediatamente
- ✅ Admin vê o preview corretamente
- ✅ Usuários veem a live sem erro

## 🚫 O QUE NÃO FAZER

- ❌ **NÃO** buscar por `channel_name`
- ❌ **NÃO** criar novas streams
- ❌ **NÃO** atualizar múltiplas streams
- ❌ **NÃO** usar `.eq('channel_name', ...)`
- ❌ **NÃO** fazer queries antes de atualizar

## ✅ O QUE FAZER

- ✅ Use **APENAS** o `streamId` fornecido
- ✅ Use `.eq('id', streamId)` para garantir atualização única
- ✅ Gere o `hlsUrl` antes de chamar a função
- ✅ Inclua os 3 logs obrigatórios na ordem correta

