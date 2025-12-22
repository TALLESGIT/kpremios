# 🔐 Assinatura Secreta do Webhook - Mercado Pago

## 📋 O que é?

A **Assinatura Secreta** é uma chave de segurança que o Mercado Pago usa para garantir que as notificações do webhook realmente vêm deles e não de um atacante.

---

## 🔑 Sua Assinatura Secreta

```
48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405
```

---

## ⚙️ Como Funciona

1. **Mercado Pago envia webhook** com um header de assinatura
2. **Nossa Edge Function valida** a assinatura usando a chave secreta
3. **Se válida** → Processa o pagamento
4. **Se inválida** → Rejeita a notificação (segurança)

---

## 🔧 Configuração

### **1. Adicionar no Supabase Secrets**

1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
2. Vá em: **Settings** → **Edge Functions** → **Secrets**
3. Adicione:

```
Nome: MERCADO_PAGO_WEBHOOK_SECRET
Valor: 48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405
```

---

## ✅ Validação Automática

A Edge Function `mercadopago-webhook` foi atualizada para:
- ✅ Validar automaticamente a assinatura
- ✅ Rejeitar webhooks inválidos
- ✅ Aceitar apenas notificações autênticas do Mercado Pago

---

## 🧪 Como Testar

1. Configure o secret no Supabase
2. Faça um pagamento de teste
3. Verifique os logs da Edge Function
4. Se a assinatura estiver correta, o webhook será processado
5. Se estiver incorreta, será rejeitado com erro 401

---

## ⚠️ Importante

- **Nunca exponha** a assinatura secreta no frontend
- **Mantenha segura** - é como uma senha
- **Use apenas** no Supabase Secrets (Edge Functions)
- **Se mudar** no Mercado Pago, atualize no Supabase também

---

## 🔄 Se Precisar Mudar

Se você gerar uma nova assinatura secreta no Mercado Pago:
1. Copie a nova chave
2. Atualize o secret no Supabase
3. A Edge Function validará automaticamente com a nova chave

---

## 📝 Resumo

- ✅ Assinatura secreta criada: `48c468b3203394e9f372afbe7a5a4af8b92c1ae8dd81d1eea49e0606ad7de405`
- ✅ Edge Function atualizada para validar
- ✅ Adicionar como secret no Supabase: `MERCADO_PAGO_WEBHOOK_SECRET`
- ✅ Segurança garantida contra webhooks falsos

