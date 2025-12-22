# 💰 Atualizar Valor VIP para R$ 10,00

## 📋 O que precisa ser feito:

### **1. Atualizar Secret no Supabase** ⚠️ OBRIGATÓRIO

O valor está configurado no secret `PREÇO_VIP_MENSAL` no Supabase.

**Como atualizar:**
1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
2. Vá em: **Settings** → **Edge Functions** → **Secrets**
3. Encontre o secret: `PREÇO_VIP_MENSAL`
4. Clique em **Editar** (ou delete e crie novo)
5. Altere o valor para: `10.00`
6. Salve

**OU crie um novo secret:**
- Nome: `VIP_MONTHLY_PRICE`
- Valor: `10.00`

---

## ✅ O que já foi atualizado:

- ✅ Componente `VipSubscriptionModal` - valor padrão atualizado para R$ 10,00
- ✅ Página `PublicLiveStreamPage` - passando R$ 10,00 como prop
- ✅ Edge Function `create-vip-payment` - lê do secret automaticamente

---

## 🧪 Como Testar:

1. Atualizar o secret no Supabase para `10.00`
2. Fazer login
3. Clicar em "Assinar VIP"
4. Verificar se mostra **R$ 10,00** no modal
5. Clicar em "Assinar VIP Agora"
6. Verificar se o link do Mercado Pago mostra R$ 10,00

---

## ⚠️ Importante:

- O valor é lido do secret `PREÇO_VIP_MENSAL` ou `VIP_MONTHLY_PRICE`
- Se o secret não existir, usa o valor padrão: R$ 10,00
- Após atualizar o secret, pode levar alguns segundos para atualizar

---

## 📝 Resumo:

- **Valor antigo:** R$ 29,90
- **Valor novo:** R$ 10,00
- **Onde atualizar:** Secret `PREÇO_VIP_MENSAL` no Supabase
- **Valor padrão no código:** R$ 10,00

