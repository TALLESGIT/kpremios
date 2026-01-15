# ⚙️ Configuração de Variáveis de Ambiente - LiveKit

## 📝 Arquivo `.env`

Você precisa criar ou atualizar o arquivo `.env` na raiz do projeto com as seguintes variáveis:

### ✅ Variáveis OBRIGATÓRIAS para LiveKit

```env
# ============================================
# CONFIGURAÇÃO SUPABASE (OBRIGATÓRIO)
# ============================================
# Obtenha no dashboard do Supabase:
# Project Settings → API → Project URL e anon/public key

VITE_SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# ============================================
# CONFIGURAÇÃO LIVEKIT (OBRIGATÓRIO)
# ============================================
# URL do LiveKit Cloud
# Você já tem esta URL: wss://zkoficial-6xokn1hv.livekit.cloud

VITE_LIVEKIT_URL=wss://zkoficial-6xokn1hv.livekit.cloud
```

### 📋 Como Obter as Credenciais

#### 1. **VITE_SUPABASE_URL** e **VITE_SUPABASE_ANON_KEY**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

#### 2. **VITE_LIVEKIT_URL**

Você já tem esta URL configurada:
```
wss://zkoficial-6xokn1hv.livekit.cloud
```

Esta URL vem do seu projeto LiveKit Cloud.

**⚠️ IMPORTANTE:** Você NÃO precisa de `LIVEKIT_API_KEY` ou `LIVEKIT_API_SECRET` no `.env` do frontend!
- O frontend só precisa da URL (`VITE_LIVEKIT_URL`)
- As credenciais secretas (`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`) ficam no Supabase (Edge Functions)
- O frontend obtém tokens através da Edge Function `livekit-token`

### 🔍 Verificação

Após configurar o `.env`, verifique se está correto:

```bash
# O arquivo .env deve estar na raiz do projeto:
ZKPremiosRaffleApplication/
├── .env          ← Arquivo aqui
├── package.json
├── vite.config.ts
└── src/
```

### ✅ Exemplo Completo do `.env`

```env
# ============================================
# SUPABASE (OBRIGATÓRIO)
# ============================================
VITE_SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEyMzQ1NjAsImV4cCI6MjAyNjgxMDU2MH0.sua-chave-aqui

# ============================================
# LIVEKIT (OBRIGATÓRIO)
# ============================================
VITE_LIVEKIT_URL=wss://zkoficial-6xokn1hv.livekit.cloud

# ============================================
# OUTRAS VARIÁVEIS (OPCIONAIS)
# ============================================
# Mantidas para compatibilidade, mas não são necessárias para LiveKit
VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
VITE_AGORA_TOKEN=seu-token-agora-aqui
```

### ⚠️ IMPORTANTE

1. **Prefix `VITE_`:** Todas as variáveis que o Vite precisa usar no frontend DEVEM começar com `VITE_`
2. **Reiniciar o servidor:** Após modificar o `.env`, reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. **Não commitar:** O arquivo `.env` NÃO deve ser commitado no Git (já está no `.gitignore`)

### 🔒 Segurança

- ✅ `.env` está no `.gitignore` - não será commitado
- ✅ Apenas a **anon key** do Supabase é exposta no frontend (seguro)
- ✅ As credenciais secretas do LiveKit (`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`) ficam no Supabase (Edge Functions), NÃO no `.env` do frontend
- ✅ O frontend nunca vê as credenciais secretas - apenas recebe tokens JWT já gerados pela Edge Function

### ❓ Problemas Comuns

#### Erro: "Supabase credentials não configuradas"

**Causa:** `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` não estão definidas.

**Solução:** Adicione as variáveis no `.env` e reinicie o servidor.

#### Erro: "Token não retornado"

**Causa:** Edge Function `livekit-token` não está configurada corretamente no Supabase.

**Solução:** Verifique se as secrets do LiveKit estão configuradas no Supabase:
- Settings → Edge Functions → Secrets
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`

### 📝 Checklist

Antes de testar, verifique:

- [ ] Arquivo `.env` existe na raiz do projeto
- [ ] `VITE_SUPABASE_URL` está configurado
- [ ] `VITE_SUPABASE_ANON_KEY` está configurado
- [ ] `VITE_LIVEKIT_URL` está configurado
- [ ] Servidor foi reiniciado após criar/atualizar `.env`
- [ ] Não há erros no console do navegador

### 🚀 Próximos Passos

1. Crie o arquivo `.env` na raiz do projeto
2. Adicione as 3 variáveis acima
3. Reinicie o servidor: `npm run dev`
4. Teste acessando uma live ativa
