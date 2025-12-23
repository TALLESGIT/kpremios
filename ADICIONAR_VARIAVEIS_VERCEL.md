# 📝 Adicionar Variáveis de Ambiente na Vercel

## Variáveis a Adicionar

Você precisa adicionar estas 2 variáveis na Vercel:

1. **`VITE_MERCADO_PAGO_PUBLIC_KEY`**
2. **`VITE_VIP_WHATSAPP_GROUP`**

---

## 📋 Passo a Passo

### 1. Acessar Configurações da Vercel

1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto: **kpremios**
3. Vá em: **Settings** (Configurações)
4. Clique em: **Environment Variables** (Variáveis de Ambiente)

---

### 2. Adicionar `VITE_MERCADO_PAGO_PUBLIC_KEY`

1. Clique em **"Add New"** ou **"Adicionar Nova"**
2. **Key (Chave):** `VITE_MERCADO_PAGO_PUBLIC_KEY`
3. **Value (Valor):** `APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8`
   - Este é o Public Key do Mercado Pago que você já tem
4. **Environment:** Selecione **"All Environments"** (Produção, Preview, Development)
5. Clique em **"Save"** ou **"Salvar"**

---

### 3. Adicionar `VITE_VIP_WHATSAPP_GROUP`

1. Clique em **"Add New"** ou **"Adicionar Nova"**
2. **Key (Chave):** `VITE_VIP_WHATSAPP_GROUP`
3. **Value (Valor):** Cole o link do seu grupo VIP do WhatsApp
   - Exemplo: `https://chat.whatsapp.com/SEU_CODIGO_DO_GRUPO_AQUI`
   - ⚠️ **IMPORTANTE:** Substitua `SEU_CODIGO_DO_GRUPO_AQUI` pelo link real do seu grupo
4. **Environment:** Selecione **"All Environments"** (Produção, Preview, Development)
5. Clique em **"Save"** ou **"Salvar"**

---

## ✅ Verificação

Após adicionar, você deve ver estas variáveis na lista:

- ✅ `VITE_AGORA_APP_ID`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_MERCADO_PAGO_PUBLIC_KEY` ← **NOVA**
- ✅ `VITE_VIP_WHATSAPP_GROUP` ← **NOVA**

---

## 🔄 Fazer Novo Deploy

Após adicionar as variáveis:

1. **Opção 1 - Redeploy automático:**
   - A Vercel pode fazer deploy automaticamente
   - Aguarde alguns minutos

2. **Opção 2 - Redeploy manual:**
   - Vá em: **Deployments**
   - Clique nos **três pontos** (⋯) do último deployment
   - Selecione: **"Redeploy"**

---

## 📝 Valores para Copiar

### `VITE_MERCADO_PAGO_PUBLIC_KEY`
```
APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8
```

### `VITE_VIP_WHATSAPP_GROUP`
```
https://chat.whatsapp.com/SEU_CODIGO_DO_GRUPO_AQUI
```
⚠️ **Substitua pelo link real do seu grupo WhatsApp VIP**

---

## 🎯 Onde Essas Variáveis São Usadas

### `VITE_MERCADO_PAGO_PUBLIC_KEY`
- Usada no componente de assinatura VIP
- Exibe informações de pagamento (opcional)

### `VITE_VIP_WHATSAPP_GROUP`
- Usada na página da live (`PublicLiveStreamPage.tsx`)
- Botão "Grupo VIP" que direciona para o grupo WhatsApp
- Aparece apenas para usuários VIP

---

## ✅ Pronto!

Após adicionar essas variáveis e fazer o redeploy, o sistema estará completo com:
- ✅ Pagamentos VIP via Mercado Pago
- ✅ Link para grupo WhatsApp VIP
- ✅ Todas as funcionalidades VIP funcionando

---

**Dica:** Se você não tiver o link do grupo WhatsApp ainda, pode criar o grupo depois e atualizar a variável. O sistema funcionará normalmente, apenas o botão não aparecerá até você configurar o link.

