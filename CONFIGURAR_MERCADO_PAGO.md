# 🔧 Como Configurar Mercado Pago - Passo a Passo

## 📋 Credenciais Recebidas

Você recebeu as seguintes credenciais do Mercado Pago:

- **Public Key**: `APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8`
- **Access Token**: `APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876`
- **Client ID**: `3077926078115104`
- **Client Secret**: `1qYoid5wLTLVcc13DZl1eGIdCSWyCCaF`

---

## ⚙️ Onde Configurar

### **1. Supabase Edge Functions (Obrigatório)**

As Edge Functions precisam do **Access Token** para funcionar.

**Passo a passo:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings** → **Edge Functions** → **Secrets**
4. Adicione os seguintes secrets:

```
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876
VIP_MONTHLY_PRICE=29.90
VITE_APP_URL=https://seu-dominio.com
```

**Importante:**
- Substitua `https://seu-dominio.com` pela URL real do seu site
- O Access Token é **confidencial** - nunca exponha no frontend!

---

### **2. Frontend (Opcional - para exibição)**

Se quiser exibir informações do Mercado Pago no frontend (opcional):

**No arquivo `.env` do projeto:**
```env
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8
VITE_VIP_WHATSAPP_GROUP=https://chat.whatsapp.com/SEU_GRUPO_AQUI
```

---

### **3. Configurar Webhook no Mercado Pago**

O webhook é necessário para receber notificações de pagamento.

**Passo a passo:**
1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em: **Suas integrações** → **Webhooks**
3. Adicione um novo webhook:
   - **URL**: `https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook`
   - **Eventos**: 
     - ✅ `payment.created`
     - ✅ `payment.updated`
     - ✅ `payment.pending`
     - ✅ `payment.approved`
     - ✅ `payment.rejected`

**URL do Webhook (SEU PROJETO):**
```
https://bukigyhhgrtgryklabjg.supabase.co/functions/v1/mercadopago-webhook
```

**Assinatura Secreta (Webhook Secret):**
```
48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405
```

**⚠️ IMPORTANTE:** Adicione esta assinatura secreta como secret no Supabase:
- Nome: `MERCADO_PAGO_WEBHOOK_SECRET`
- Valor: `48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405`

**Como configurar:**
1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em: **Suas integrações** → **Webhooks**
3. Clique em **Adicionar webhook**
4. Cole a URL acima
5. Selecione os eventos: `payment.created`, `payment.updated`, `payment.approved`
6. Salve

---

## 🔐 Segurança

### **O que é confidencial:**
- ❌ **Access Token** - NUNCA exponha no frontend
- ❌ **Client Secret** - NUNCA exponha no frontend
- ✅ **Public Key** - Pode estar no frontend (é pública mesmo)

### **Onde cada credencial vai:**

| Credencial | Onde Configurar | Uso |
|------------|----------------|-----|
| **Access Token** | Supabase Edge Functions (Secrets) | Backend - Criar pagamentos |
| **Public Key** | Frontend `.env` (opcional) | Frontend - Exibir informações |
| **Client ID** | Não necessário para nossa integração | - |
| **Client Secret** | Não necessário para nossa integração | - |

---

## ✅ Checklist de Configuração

- [ ] Adicionar `MERCADO_PAGO_ACCESS_TOKEN` no Supabase Edge Functions Secrets
- [ ] Adicionar `VIP_MONTHLY_PRICE=29.90` no Supabase Edge Functions Secrets
- [ ] Adicionar `VITE_APP_URL` no Supabase Edge Functions Secrets
- [ ] Configurar webhook no Mercado Pago
- [ ] Adicionar `VITE_VIP_WHATSAPP_GROUP` no `.env` do frontend
- [ ] Testar criação de pagamento
- [ ] Testar webhook (fazer pagamento de teste)

---

## 🧪 Como Testar

### **1. Testar Criação de Link de Pagamento:**
1. Fazer login no sistema
2. Clicar em "Assinar VIP"
3. Clicar em "Assinar VIP Agora"
4. Deve abrir link do Mercado Pago

### **2. Testar Webhook:**
1. Fazer um pagamento de teste no Mercado Pago
2. Verificar logs do Supabase Edge Functions
3. Verificar se VIP foi ativado no banco de dados

---

## 📝 Notas Importantes

- **Modo Sandbox**: As credenciais que você recebeu são do modo **teste** (sandbox)
- **Produção**: Quando for para produção, você receberá novas credenciais
- **Webhook**: Deve ser configurado para receber notificações automáticas
- **URL do App**: Use a URL real do seu site (ex: `https://zkpremios.com`)

---

## 🚀 Próximos Passos

1. Configure as variáveis no Supabase
2. Configure o webhook no Mercado Pago
3. Teste a criação de pagamento
4. Faça um pagamento de teste
5. Verifique se o VIP foi ativado automaticamente

---

## ❓ Dúvidas?

- **Access Token não funciona?** Verifique se está no modo correto (teste/produção)
- **Webhook não recebe notificações?** Verifique a URL e os eventos selecionados
- **VIP não ativa?** Verifique os logs do Supabase Edge Functions

