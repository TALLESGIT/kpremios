# ✅ Checklist de Secrets no Supabase

## 🎯 Status: CREDENCIAIS DE PRODUÇÃO

⚠️ **ATENÇÃO:** Você está usando credenciais de **PRODUÇÃO**!
- Receberá pagamentos **REAIS**
- Configure com cuidado
- Teste primeiro com valores pequenos

---

## 🔐 Secrets que você JÁ configurou:

- ✅ **MERCADO_PAGO_WEBHOOK_SECRET** = `48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405`

---

## 🔐 Secrets que ainda FALTAM configurar:

### **1. MERCADO_PAGO_ACCESS_TOKEN** ⚠️ OBRIGATÓRIO
```
Valor: APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876
```
**Onde usar:** Edge Functions `create-vip-payment` e `mercadopago-webhook`

### **2. VIP_MONTHLY_PRICE** ou **PREÇO_VIP_MENSAL** ⚠️ OBRIGATÓRIO
```
Valor: 10.00
```
⚠️ **Valor mensal do VIP: R$ 10,00**
**Onde usar:** Edge Function `create-vip-payment` (valor mensal do VIP)

### **3. VITE_APP_URL** ⚠️ OBRIGATÓRIO
```
Valor: https://seu-dominio.com
```
**Onde usar:** Edge Function `create-vip-payment` (URLs de retorno após pagamento)
**⚠️ IMPORTANTE:** Substitua pela URL real do seu site!

### **4. SUPABASE_SERVICE_ROLE_KEY** ⚠️ OBRIGATÓRIO
```
Valor: (sua service role key)
```
**Onde usar:** Edge Function `mercadopago-webhook` (para acessar banco de dados)
**Como obter:** Settings → API → service_role key (não a anon key!)

### **5. SUPABASE_URL** (Opcional - geralmente já configurado)
```
Valor: https://bukigyhhgrtgryklabjg.supabase.co
```
**Onde usar:** Edge Function `mercadopago-webhook`

---

## 📝 Passo a Passo para Adicionar os Secrets Restantes:

1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
2. Vá em: **Settings** → **Edge Functions** → **Secrets**
3. Clique em **Add new secret** para cada um:

**Secret 1:**
- Nome: `MERCADO_PAGO_ACCESS_TOKEN`
- Valor: `APP_USR-3077926078115104-122218-6d18b1a798860969f263f9cf0e766895-2672588876`

**Secret 2:**
- Nome: `VIP_MONTHLY_PRICE`
- Valor: `29.90`

**Secret 3:**
- Nome: `VITE_APP_URL`
- Valor: `https://seu-dominio.com` (substitua pela URL real!)

**Secret 4:**
- Nome: `SUPABASE_SERVICE_ROLE_KEY`
- Valor: (pegue em Settings → API → service_role key)

**Secret 5 (se não existir):**
- Nome: `SUPABASE_URL`
- Valor: `https://bukigyhhgrtgryklabjg.supabase.co`

---

## ✅ Após Configurar Todos os Secrets:

1. ✅ Testar criação de pagamento
2. ✅ Fazer pagamento de teste
3. ✅ Verificar se webhook funciona
4. ✅ Verificar se VIP foi ativado

---

## 🧪 Como Testar:

1. Fazer login no sistema
2. Ir para página da live
3. Clicar em **"Assinar VIP"**
4. Clicar em **"Assinar VIP Agora"**
5. Deve abrir link do Mercado Pago
6. Fazer pagamento de teste
7. Verificar se VIP foi ativado automaticamente

---

## ⚠️ Importante:

- **Service Role Key** é diferente da **Anon Key**
- **VITE_APP_URL** deve ser a URL real do seu site (não localhost)
- Todos os secrets são **CONFIDENCIAIS** - nunca exponha no frontend

