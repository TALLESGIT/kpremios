# 💳 Integração com API do Mercado Pago - VIP

## 📋 Visão Geral

Sistema de pagamento VIP mensal usando **API do Mercado Pago** com **links dinâmicos** (um link único por usuário).

---

## 🔄 Fluxo Completo

### **1. Usuário Clica "Assinar VIP"**
- Interface mostra modal com informações
- Botão "Pagar com Mercado Pago"
- Sistema gera link único para o usuário

### **2. Geração de Link Dinâmico**
- Sistema chama API do Mercado Pago
- Cria preferência de pagamento (preference)
- Link único gerado: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=xxxxx`
- Link contém ID do usuário para identificação

### **3. Usuário Faz Pagamento**
- Redirecionado para Mercado Pago
- Faz pagamento (PIX, cartão, etc.)
- Mercado Pago processa pagamento

### **4. Webhook do Mercado Pago**
- Mercado Pago envia notificação para nosso sistema
- Edge Function recebe webhook
- Verifica status do pagamento
- Se aprovado → Ativa VIP por 30 dias

### **5. Renovação Mensal**
- Sistema verifica expiração diariamente
- Se expirou → Verifica se há pagamento do mês
- Se pagou → Renova automaticamente
- Se não pagou → Desativa VIP

---

## 🛠️ Estrutura Técnica

### **1. Tabela `vip_subscriptions`**
```sql
CREATE TABLE vip_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status TEXT, -- 'active', 'expired', 'cancelled', 'pending'
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  payment_id TEXT, -- ID do pagamento no Mercado Pago
  preference_id TEXT, -- ID da preferência gerada
  renewal_date DATE, -- Próxima data de renovação
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Edge Function: `create-vip-payment`**
- Recebe: `user_id`
- Gera preferência no Mercado Pago
- Retorna: Link de pagamento único

### **3. Edge Function: `mercadopago-webhook`**
- Recebe: Webhook do Mercado Pago
- Verifica status do pagamento
- Ativa/renova VIP se aprovado

### **4. Job Diário (Cron)**
- Verifica expirações
- Renova se houver pagamento
- Desativa se não pagou

---

## 📝 Variáveis de Ambiente

### **Supabase Edge Functions (Secrets):**
```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876
VIP_MONTHLY_PRICE=29.90
VITE_APP_URL=https://seu-dominio.com
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### **Frontend (.env):**
```env
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8
VITE_VIP_WHATSAPP_GROUP=https://chat.whatsapp.com/SEU_GRUPO_AQUI
```

**⚠️ IMPORTANTE:**
- Access Token é **CONFIDENCIAL** - configure apenas no Supabase Secrets
- Public Key pode estar no frontend (é pública)
- Substitua `https://seu-dominio.com` pela URL real do seu site

---

## 🔐 Segurança

- **Access Token**: Apenas no servidor (Edge Function)
- **Public Key**: Pode estar no frontend
- **Webhook Secret**: Validar assinatura do webhook
- **Verificação**: Sempre verificar status no Mercado Pago antes de ativar

---

## 💰 Configuração no Mercado Pago

1. **Criar Aplicação** no Mercado Pago
2. **Obter Credenciais**:
   - Public Key (frontend)
   - Access Token (backend)
3. **Configurar Webhook**:
   - URL: `https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook`
   - Eventos: `payment.created`, `payment.updated`
4. **Criar Produto VIP**:
   - Valor mensal
   - Descrição
   - ID do produto

---

## 🚀 Próximos Passos

1. Criar migração SQL com tabela `vip_subscriptions`
2. Criar Edge Function `create-vip-payment`
3. Criar Edge Function `mercadopago-webhook`
4. Criar interface de assinatura VIP
5. Implementar job de verificação/renovação

