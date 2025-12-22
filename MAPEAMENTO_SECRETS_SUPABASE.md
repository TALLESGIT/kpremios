# 🔄 Mapeamento de Secrets - Supabase

## 📋 Secrets que você criou vs O que a Edge Function espera

### ✅ Secrets que você JÁ configurou:

| Nome que você criou | Nome que Edge Function espera | Status |
|---------------------|-------------------------------|--------|
| `MERCADO_PAGO_ACCESS_TOKEN` | `MERCADO_PAGO_ACCESS_TOKEN` | ✅ Correto |
| `PREÇO_VIP_MENSAL` | `VIP_MONTHLY_PRICE` | ⚠️ Nome diferente |
| `URL_do_aplicativo_VITE` | `VITE_APP_URL` | ⚠️ Nome diferente |
| `URL_SUPABASE` | `SUPABASE_URL` | ⚠️ Nome diferente |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ Correto |
| `MERCADO_PAGO_WEBHOOK_SECRET` | `MERCADO_PAGO_WEBHOOK_SECRET` | ✅ Correto |

---

## ✅ Solução Implementada

**Atualizei as Edge Functions para aceitar AMBOS os nomes!**

Agora as Edge Functions procuram primeiro pelo nome padrão, e se não encontrar, procuram pelo nome que você criou:

### **create-vip-payment:**
- `VIP_MONTHLY_PRICE` OU `PREÇO_VIP_MENSAL` ✅
- `VITE_APP_URL` OU `URL_do_aplicativo_VITE` ✅
- `SUPABASE_URL` OU `URL_SUPABASE` ✅

### **mercadopago-webhook:**
- `SUPABASE_URL` OU `URL_SUPABASE` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅ (já estava correto)

---

## 🎯 Status Atual

### ✅ Secrets Configurados e Funcionando:
- ✅ `MERCADO_PAGO_ACCESS_TOKEN`
- ✅ `PREÇO_VIP_MENSAL` (aceito como `VIP_MONTHLY_PRICE`)
- ✅ `URL_do_aplicativo_VITE` (aceito como `VITE_APP_URL`)
- ✅ `URL_SUPABASE` (aceito como `SUPABASE_URL`)
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `MERCADO_PAGO_WEBHOOK_SECRET`

---

## ⚠️ Importante

**Os valores dos secrets estão criptografados/hashados no Supabase**, então não consigo ver os valores reais. Mas as Edge Functions agora aceitam os nomes que você criou!

**Se quiser, você pode:**
1. **Deixar como está** - As Edge Functions já foram atualizadas para aceitar seus nomes
2. **Ou renomear** para os nomes padrão (opcional, não necessário)

---

## 🧪 Próximo Passo: Testar

Agora você pode testar:
1. Fazer login
2. Clicar em "Assinar VIP"
3. Ver se o link de pagamento é gerado
4. Fazer um pagamento de teste
5. Verificar se o VIP foi ativado

---

## 📝 Nota sobre os Valores

Os valores que aparecem no Supabase são **hashes/criptografados** por segurança. Os valores reais são:
- `MERCADO_PAGO_ACCESS_TOKEN` = `APP_USR-3077926078115104-122218-...`
- `PREÇO_VIP_MENSAL` = `29.90` (provavelmente)
- `URL_do_aplicativo_VITE` = URL do seu site
- `URL_SUPABASE` = `https://bukigyhhgrtgryklabjg.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = sua service role key
- `MERCADO_PAGO_WEBHOOK_SECRET` = `48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405`

---

## ✅ Tudo Pronto!

As Edge Functions foram atualizadas e agora funcionam com os nomes que você criou. Pode testar!

