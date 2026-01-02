# 🎯 INSTRUÇÕES COMPLETAS - SETUP ZKTV NO SUPABASE

## ✅ CONFIRMAÇÕES

1. **Repo:** kpremios ✅
2. **Branch:** main ✅  
3. **Supabase:** Conectado ✅

---

## 📋 PARTE 1: COPIAR E COLAR NO SUPABASE

### 1️⃣ Abra o Supabase Dashboard
- Vá em **SQL Editor**
- Clique em **New query**

### 2️⃣ Cole e Execute este SQL:

```sql
-- =====================================================
-- 🎯 SETUP ZKTV NO SUPABASE
-- =====================================================

-- 1️⃣ ADICIONAR CAMPOS HLS E STARTED_AT
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS hls_url text,
ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Comentários
COMMENT ON COLUMN live_streams.hls_url IS 'URL do arquivo .m3u8 do Agora (HLS) para mobile';
COMMENT ON COLUMN live_streams.started_at IS 'Data/hora em que a live foi iniciada';

-- 2️⃣ CRIAR REGISTRO INICIAL ZKTV
INSERT INTO live_streams (title, description, channel_name, is_active, viewer_count)
VALUES ('ZK TV', 'Transmissão ao vivo do ZK TV', 'zktv', false, 0)
ON CONFLICT (channel_name) DO NOTHING;

-- 3️⃣ GARANTIR REALTIME HABILITADO
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS live_streams;
ALTER TABLE live_streams REPLICA IDENTITY FULL;
```

### 3️⃣ Verificar se funcionou:

Execute este SQL para confirmar:

```sql
-- Verificar se os campos foram adicionados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'live_streams' 
  AND column_name IN ('hls_url', 'started_at');

-- Verificar se o registro zktv foi criado
SELECT id, channel_name, is_active, hls_url, started_at 
FROM live_streams 
WHERE channel_name = 'zktv';
```

**✅ Se aparecer os campos `hls_url` e `started_at`, está tudo certo!**

---

## 🔧 PARTE 2: ADAPTAR O CÓDIGO DO ADMIN

### Onde está o código:
- Arquivo: `src/pages/AdminLiveStreamPage.tsx`
- Funções: `startStream()` (linha ~114) e `stopStream()` (linha ~127)

### 🟢 QUANDO A LIVE INICIA (`startStream`)

**ANTES:**
```typescript
const { data, error } = await supabase
  .from('live_streams')
  .update({ is_active: true })
  .eq('id', selectedStream.id)
  .select()
  .single();
```

**DEPOIS (adaptar para):**
```typescript
// ⚠️ IMPORTANTE: Substitua 'https://SUA_URL_DO_AGORA.m3u8' pela URL real do Agora
const hlsUrl = 'https://SUA_URL_DO_AGORA.m3u8'; // URL do .m3u8 do Agora

const { data, error } = await supabase
  .from('live_streams')
  .update({ 
    is_active: true,
    hls_url: hlsUrl,
    started_at: new Date().toISOString()
  })
  .eq('id', selectedStream.id)
  .select()
  .single();
```

### 🔴 QUANDO A LIVE ENCERRA (`stopStream`)

**ANTES:**
```typescript
.update({ is_active: false, viewer_count: 0 })
```

**DEPOIS (adaptar para):**
```typescript
.update({ 
  is_active: false, 
  viewer_count: 0,
  hls_url: null  // Limpar URL quando encerrar
})
```

---

## 🧠 COMO O SISTEMA VAI FUNCIONAR

### Fluxo Completo:

```
1. Admin clica "Iniciar Live"
   ↓
2. Código atualiza Supabase:
   - is_active = true
   - hls_url = 'https://agora...m3u8'
   - started_at = now()
   ↓
3. Realtime propaga mudança para todos os usuários
   ↓
4. Frontend detecta mudança:
   - Se is_active = true → Abre player
   - Mobile → Usa hls_url (.m3u8)
   - Desktop → Usa RTC (Agora)
   ↓
5. Admin clica "Encerrar Live"
   ↓
6. Código atualiza Supabase:
   - is_active = false
   - hls_url = null
   ↓
7. Realtime propaga → Todos os usuários são desconectados
```

---

## 📝 CHECKLIST FINAL

- [ ] SQL executado no Supabase
- [ ] Campos `hls_url` e `started_at` criados
- [ ] Registro `zktv` criado na tabela
- [ ] Realtime habilitado
- [ ] Código do admin adaptado para incluir `hls_url` e `started_at`
- [ ] URL do Agora configurada corretamente

---

## ⚠️ IMPORTANTE

1. **URL do Agora:** Você precisa obter a URL `.m3u8` do Agora quando a live inicia
2. **Realtime:** Já está configurado, mas verifique se está funcionando
3. **Policies:** As policies de leitura pública já estão corretas

---

## 🚀 PRÓXIMOS PASSOS

Depois de executar o SQL e adaptar o código:

1. Teste iniciar uma live pelo admin
2. Verifique se o registro no Supabase foi atualizado
3. Acesse pelo frontend e veja se detecta a live ativa
4. Teste encerrar a live e verificar se todos são desconectados

---

**✅ Pronto! Agora é só executar o SQL e adaptar o código!**

