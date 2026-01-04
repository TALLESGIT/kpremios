# 🔗 FLUXO COMPLETO - Criação de Live e Geração de Link

## 📋 COMO FUNCIONA

### 1️⃣ **ADMIN CRIA A LIVE**

**No painel admin:**
1. Admin digita o título: **"Cruzeiro x Santos"**
2. Clica em "Criar Live"
3. Sistema gera automaticamente:
   - **Slug:** `cruzeiro-x-santos` (baseado no título)
   - **Link:** `https://zkoficial.com.br/live/cruzeiro-x-santos`
   - **Canal LiveKit:** `cruzeiro-x-santos`

**O que acontece:**
```typescript
Título: "Cruzeiro x Santos"
  ↓
generateSlugFromTitle()
  ↓
Slug: "cruzeiro-x-santos"
  ↓
Link: https://zkoficial.com.br/live/cruzeiro-x-santos
```

### 2️⃣ **ADMIN INICIA A TRANSMISSÃO**

**Quando admin clica "INICIAR LIVE":**
1. Sistema atualiza Supabase:
   - `is_active = true`
   - `hls_url = https://zkoficial-6xokn1hv.livekit.cloud/hls/cruzeiro-x-santos/index.m3u8`
   - `started_at = now()`

2. **Link é copiado automaticamente** para área de transferência
3. Admin recebe notificação: `"Você está AO VIVO! Link copiado: https://zkoficial.com.br/live/cruzeiro-x-santos"`

### 3️⃣ **ADMIN COMPARTILHA O LINK**

**O link gerado:**
```
https://zkoficial.com.br/live/cruzeiro-x-santos
```

**Admin pode:**
- ✅ Copiar o link (já copiado automaticamente)
- ✅ Compartilhar via WhatsApp/Telegram/etc
- ✅ Ver o link no painel admin (AdminLivePanel)

### 4️⃣ **USUÁRIOS ACESSAM O LINK**

**Quando usuário acessa:**
```
https://zkoficial.com.br/live/cruzeiro-x-santos
```

**O que acontece:**
1. Site busca no Supabase: `live_streams` onde `channel_name = 'cruzeiro-x-santos'`
2. Se `is_active = true` → Mostra o player HLS
3. Se `is_active = false` → Mostra "Live Offline"
4. Realtime detecta mudanças automaticamente

---

## 🎯 EXEMPLO PRÁTICO

### Cenário: Jogo Cruzeiro x Santos

**1. Admin cria a live:**
```
Título: "Cruzeiro x Santos"
  ↓
Slug gerado: "cruzeiro-x-santos"
  ↓
Link: https://zkoficial.com.br/live/cruzeiro-x-santos
```

**2. Admin inicia a transmissão:**
- ZK Studio conecta ao LiveKit (sala: `cruzeiro-x-santos`)
- Supabase atualizado: `is_active = true`
- Link copiado automaticamente

**3. Admin compartilha:**
- Envia link no WhatsApp: `https://zkoficial.com.br/live/cruzeiro-x-santos`
- Usuários clicam no link

**4. Usuários assistem:**
- Acessam o link
- Site detecta `is_active = true`
- Player HLS carrega automaticamente
- Transmissão ao vivo começa

---

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

1. ✅ **Geração automática de slug** do título
2. ✅ **Link gerado automaticamente** quando cria a live
3. ✅ **Link copiado automaticamente** quando inicia a live
4. ✅ **Link visível no painel admin** (AdminLivePanel)
5. ✅ **Botões de copiar/compartilhar** no painel
6. ✅ **Rota dinâmica** `/live/:channelName`
7. ✅ **Detecção automática** via Realtime

---

## 🔧 CÓDIGO RELEVANTE

### Geração de Slug:
```typescript
const generateSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};
```

### Link Gerado:
```typescript
const baseUrl = window.location.origin;
const liveLink = `${baseUrl}/live/${channelName}`;
// Exemplo: https://zkoficial.com.br/live/cruzeiro-x-santos
```

### Quando Inicia a Live:
```typescript
// Link copiado automaticamente
await navigator.clipboard.writeText(liveLink);
toast.success(`Você está AO VIVO! Link copiado: ${liveLink}`);
```

---

## 📱 RESUMO

**Fluxo completo:**
1. Admin cria live com título → Link gerado
2. Admin inicia live → Link copiado automaticamente
3. Admin compartilha link → Usuários acessam
4. Site detecta live ativa → Player HLS carrega
5. Usuários assistem a transmissão ao vivo

**Tudo automático!** 🚀

