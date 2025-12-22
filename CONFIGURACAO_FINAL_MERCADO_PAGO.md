# ✅ Configuração Final - Mercado Pago

## 🔗 URL do Seu Projeto Supabase

```
https://bukigyhhgrtgryklabjg.supabase.co
```

---

## 📝 Passo a Passo Completo

### **1. Configurar Secrets no Supabase** ⚠️ OBRIGATÓRIO

1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
2. Vá em: **Settings** → **Edge Functions** → **Secrets**
3. Clique em **Add new secret** e adicione cada uma:

```
⚠️ CREDENCIAIS DE PRODUÇÃO - Receberá pagamentos REAIS!

Nome: MERCADO_PAGO_ACCESS_TOKEN
Valor: APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876

Nome: VIP_MONTHLY_PRICE ou PREÇO_VIP_MENSAL
Valor: 10.00

Nome: VITE_APP_URL
Valor: https://seu-dominio.com
(Substitua pela URL real do seu site)

Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: (sua service role key - pegue em Settings → API)

Nome: MERCADO_PAGO_WEBHOOK_SECRET
Valor: 48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405
```

---

### **2. Configurar Webhook no Mercado Pago** ⚠️ OBRIGATÓRIO

1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em: **Suas integrações** → **Webhooks**
3. Clique em **Adicionar webhook**
4. Configure:

**URL do Webhook:**
```
https://bukigyhhgrtgryklabjg.supabase.co/functions/v1/mercadopago-webhook
```

**Eventos a escutar:**
- ✅ `payment.created`
- ✅ `payment.updated`
- ✅ `payment.approved`
- ✅ `payment.pending`
- ✅ `payment.rejected`

5. Clique em **Salvar**

---

### **3. Configurar Frontend (.env)** ⚠️ OPCIONAL

No arquivo `.env` do projeto:

```env
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-3e112239-954a-47f7-8d90-da12cb8dccd8
VITE_VIP_WHATSAPP_GROUP=https://chat.whatsapp.com/SEU_GRUPO_AQUI
```

**Importante:** Substitua `SEU_GRUPO_AQUI` pelo link real do grupo WhatsApp VIP.

---

## ✅ Checklist de Configuração

- [x] Adicionar `MERCADO_PAGO_WEBHOOK_SECRET` no Supabase Secrets ✅
- [ ] Adicionar `MERCADO_PAGO_ACCESS_TOKEN` no Supabase Secrets
- [ ] Adicionar `VIP_MONTHLY_PRICE=29.90` no Supabase Secrets
- [ ] Adicionar `VITE_APP_URL` no Supabase Secrets (com URL real)
- [ ] Adicionar `SUPABASE_SERVICE_ROLE_KEY` no Supabase Secrets
- [ ] Configurar webhook no Mercado Pago com a URL correta
- [ ] Selecionar eventos do webhook (payment.created, payment.updated, etc.)
- [ ] Adicionar `VITE_VIP_WHATSAPP_GROUP` no `.env` do frontend
- [ ] Testar criação de pagamento
- [ ] Testar webhook (fazer pagamento de teste)

---

## 🧪 Como Testar

### **1. Testar Criação de Link de Pagamento:**
1. Fazer login no sistema
2. Ir para página da live
3. Clicar em **"Assinar VIP"** (botão roxo no canto inferior direito)
4. Modal deve abrir
5. Clicar em **"Assinar VIP Agora"**
6. Deve abrir link do Mercado Pago em nova aba

### **2. Testar Webhook:**
1. Fazer um pagamento de teste no Mercado Pago
2. Verificar logs do Supabase:
   - Vá em: **Edge Functions** → **Logs**
   - Procure por `mercadopago-webhook`
3. Verificar se VIP foi ativado:
   - Verificar tabela `users` → campo `is_vip` deve ser `true`
   - Verificar tabela `vip_subscriptions` → deve ter registro

---

## 🔍 Verificar Service Role Key

Para encontrar a Service Role Key:

1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
2. Vá em: **Settings** → **API**
3. Procure por **service_role key** (não a anon key!)
4. Copie e adicione como secret: `SUPABASE_SERVICE_ROLE_KEY`

---

## ⚠️ Importante

- **Access Token** é CONFIDENCIAL - nunca exponha no frontend
- **Service Role Key** é CONFIDENCIAL - nunca exponha no frontend
- **Webhook** deve estar configurado para receber notificações
- **URL do App** deve ser a URL real do seu site (não localhost)

---

## 🚀 Próximos Passos

1. ✅ Configure os secrets no Supabase
2. ✅ Configure o webhook no Mercado Pago
3. ✅ Adicione o link do grupo WhatsApp
4. ✅ Teste a criação de pagamento
5. ✅ Faça um pagamento de teste
6. ✅ Verifique se o VIP foi ativado automaticamente

---

## 📞 Suporte

Se algo não funcionar:
1. Verifique os logs do Supabase Edge Functions
2. Verifique os logs do Mercado Pago (webhooks)
3. Verifique se todas as variáveis estão configuradas
4. Teste com pagamento de teste primeiro

