# 🚀 Deploy da Edge Function `create-pool-payment`

## ⚠️ Problema Atual

O erro `Edge Function returned a non-2xx status code` está ocorrendo porque:
- ✅ **Código corrigido** já está no GitHub
- ❌ **Edge Function no Supabase** ainda está com versão antiga

---

## ✅ Solução: Fazer Deploy da Edge Function

### **Opção 1: Via Supabase Dashboard (Recomendado)**

1. **Acesse:** https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá em:** **Edge Functions** (no menu lateral)
4. **Clique em:** `create-pool-payment`
5. **Clique em:** **Deploy** ou **Redeploy**
6. **Aguarde** alguns segundos para o deploy completar

---

### **Opção 2: Via Supabase CLI**

Se você tem o Supabase CLI instalado:

```bash
# 1. Verificar se está logado
supabase login

# 2. Linkar o projeto (se ainda não estiver linkado)
supabase link --project-ref SEU_PROJECT_REF

# 3. Fazer deploy da função específica
supabase functions deploy create-pool-payment

# Ou fazer deploy de todas as funções
supabase functions deploy
```

---

### **Opção 3: Via GitHub Actions (Se configurado)**

Se você tem GitHub Actions configurado para fazer deploy automático:

1. **Verifique** se o workflow está configurado
2. **Faça um commit** vazio para triggerar o deploy:
   ```bash
   git commit --allow-empty -m "trigger: redeploy edge functions"
   git push
   ```

---

## 🔍 Verificar se o Deploy Funcionou

1. **Acesse:** Supabase Dashboard → Edge Functions → `create-pool-payment`
2. **Verifique:**
   - ✅ Último deploy deve ser recente
   - ✅ Status deve estar "Active"
   - ✅ Logs devem mostrar a versão atualizada

---

## 📋 Checklist de Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas na Edge Function:

1. **MERCADO_PAGO_ACCESS_TOKEN** - Token de acesso do Mercado Pago
2. **SUPABASE_URL** - URL do seu projeto Supabase
3. **SUPABASE_SERVICE_ROLE_KEY** - Chave de serviço do Supabase (opcional, para atualizar payment_id)

**Como configurar:**
1. Supabase Dashboard → Edge Functions → `create-pool-payment`
2. Clique em **Settings** ou **Secrets**
3. Adicione/verifique as variáveis de ambiente

---

## 🐛 Depuração

Após o deploy, quando o erro ocorrer novamente, você verá logs mais detalhados:

1. **No console do navegador:**
   - Mensagens de erro mais detalhadas
   - Status HTTP e corpo da resposta

2. **Nos logs da Edge Function:**
   - Supabase Dashboard → Edge Functions → `create-pool-payment` → **Logs**
   - Verifique os logs em tempo real para ver o erro completo

---

## 📝 Notas Importantes

- ⚠️ O deploy pode levar alguns minutos para propagar
- ⚠️ Limpe o cache do navegador após o deploy
- ⚠️ Teste em modo anônimo para evitar cache

