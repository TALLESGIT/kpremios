# 🚀 Configurar Domínio AGORA - www.zkoficial.com.br

## ⚡ Passos Rápidos (10 minutos)

### **1. Configurar Site URL e Redirect URLs no Supabase** ⚠️ OBRIGATÓRIO

**Acesse:** https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api

#### **A) Site URL:**
1. Encontre: **Site URL**
2. Altere para: `https://www.zkoficial.com.br`
3. Clique em **Save**

#### **B) Redirect URLs:**
1. Encontre: **Redirect URLs**
2. Adicione estas URLs (uma por linha):
```
https://www.zkoficial.com.br
https://www.zkoficial.com.br/**
https://zkoficial.com.br
https://zkoficial.com.br/**
http://localhost:5173
http://localhost:5173/**
```
3. Clique em **Save**

---

### **2. Atualizar Secret VITE_APP_URL** ⚠️ OBRIGATÓRIO

**Acesse:** https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/functions

1. Encontre o secret: `VITE_APP_URL` ou `URL_do_aplicativo_VITE`
2. Se não existir, clique em **Add new secret**
3. Nome: `VITE_APP_URL`
4. Valor: `https://www.zkoficial.com.br`
5. Clique em **Save**

**Por que precisa:**
- As Edge Functions do Mercado Pago precisam saber para onde redirecionar após pagamento
- Usado nos callbacks de pagamento VIP

---

### **3. Configurar CORS (Opcional, mas recomendado)**

**Acesse:** https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api

1. Vá em: **CORS**
2. Adicione: `https://www.zkoficial.com.br`
3. Adicione: `https://zkoficial.com.br`
4. Clique em **Save**

---

## ✅ Checklist Rápido

- [ ] **Site URL** = `https://www.zkoficial.com.br`
- [ ] **Redirect URLs** adicionadas (6 URLs)
- [ ] **Secret VITE_APP_URL** = `https://www.zkoficial.com.br`
- [ ] **CORS** configurado (opcional)

---

## 🧪 Testar Depois de Configurar

1. **Aguarde 2-3 minutos** (pode levar alguns segundos para atualizar)
2. **Limpe o cache do navegador:**
   - Pressione `Ctrl + Shift + Delete`
   - Marque "Imagens e arquivos em cache"
   - Clique em "Limpar dados"
3. **Teste o acesso:**
   - Abra: `https://www.zkoficial.com.br`
   - Tente fazer login
   - Verifique se redireciona corretamente

---

## 🔍 Se Ainda Não Funcionar

### **Teste 1: Verificar se o site está no ar**
Abra: `https://www.zkoficial.com.br`
- ✅ **Se abrir**: O problema é no Supabase → Configure os passos acima
- ❌ **Se não abrir**: O problema é no DNS/servidor → Verifique hospedagem

### **Teste 2: Verificar DNS**
Abra PowerShell e execute:
```bash
nslookup www.zkoficial.com.br
```
- Se retornar um IP → DNS OK
- Se não retornar → Configure DNS primeiro

### **Teste 3: Verificar Console do Navegador**
1. Abra `https://www.zkoficial.com.br`
2. Pressione `F12`
3. Vá em **Console**
4. Procure por erros:
   - `CORS` → Configure CORS no Supabase
   - `redirect_uri_mismatch` → Configure Redirect URLs
   - `ERR_CONNECTION_REFUSED` → Problema no servidor/DNS

---

## 📝 Resumo do Domínio

**Domínio de Produção:** `https://www.zkoficial.com.br`

**Onde configurar:**
1. ✅ Supabase → Settings → API → Site URL
2. ✅ Supabase → Settings → API → Redirect URLs
3. ✅ Supabase → Settings → Edge Functions → Secrets → VITE_APP_URL
4. ✅ Supabase → Settings → API → CORS (opcional)

---

## 🔗 Links Diretos

- **Configurar Site URL e Redirects**: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api
- **Configurar Secrets**: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/functions
- **Ver Logs**: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/logs/edge-functions

---

## ⚠️ Importante

- **Sempre use HTTPS** (não HTTP) para produção
- **Configure ambos**: `www.zkoficial.com.br` e `zkoficial.com.br`
- **Aguarde alguns minutos** após configurar (pode levar até 2-3 minutos)
- **Teste em modo anônimo** para evitar cache do navegador

---

**Depois de configurar, me avise se funcionou!** 🚀

