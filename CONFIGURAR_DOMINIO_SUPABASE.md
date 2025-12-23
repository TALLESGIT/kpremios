# 🌐 Configurar Domínio no Supabase - www.zkoficial.com.br

## ⚠️ O Erro ERR_CONNECTION_REFUSED

Este erro geralmente acontece quando:
1. O domínio não está configurado no Supabase
2. O DNS não está apontando corretamente
3. O servidor não está rodando

---

## 📋 O que precisa ser configurado no Supabase:

### **1. Site URL** ⚠️ OBRIGATÓRIO

1. Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
2. Vá em: **Settings** → **API** → **URL Configuration**
3. Encontre: **Site URL**
4. Altere para: `https://www.zkoficial.com.br`
5. Salve

---

### **2. Redirect URLs** ⚠️ OBRIGATÓRIO

1. Ainda em: **Settings** → **API** → **URL Configuration**
2. Encontre: **Redirect URLs**
3. Adicione as seguintes URLs (uma por linha):

```
https://www.zkoficial.com.br
https://www.zkoficial.com.br/**
https://zkoficial.com.br
https://zkoficial.com.br/**
http://localhost:5173
http://localhost:5173/**
```

4. Clique em **Save**

**Por que precisa:**
- O Supabase Auth precisa saber quais URLs podem receber redirects após login
- Sem isso, o login pode falhar ou redirecionar para localhost

---

### **3. CORS Origins** ⚠️ OBRIGATÓRIO (se usar API direto)

1. Em: **Settings** → **API** → **CORS**
2. Adicione: `https://www.zkoficial.com.br`
3. Adicione: `https://zkoficial.com.br` (sem www)
4. Salve

---

### **4. Atualizar Secret VITE_APP_URL** ⚠️ OBRIGATÓRIO

1. Vá em: **Settings** → **Edge Functions** → **Secrets**
2. Encontre: `VITE_APP_URL` ou `URL_do_aplicativo_VITE`
3. Altere o valor para: `https://www.zkoficial.com.br`
4. Salve

**Por que precisa:**
- As Edge Functions do Mercado Pago precisam saber para onde redirecionar após pagamento
- Usado nos callbacks de pagamento

---

## 🔍 Verificar DNS

Antes de configurar no Supabase, verifique se o DNS está correto:

### **Como verificar:**

1. Abra o terminal (PowerShell ou CMD)
2. Execute:
```bash
nslookup www.zkoficial.com.br
```

3. Verifique se retorna um IP válido

### **O que deve estar configurado:**

- **Tipo A**: `www.zkoficial.com.br` → IP do seu servidor
- **Tipo A**: `zkoficial.com.br` → IP do seu servidor (opcional, mas recomendado)
- **Tipo CNAME**: `www` → `zkoficial.com.br` (se usar)

---

## 🚀 Onde está hospedado o site?

O erro `ERR_CONNECTION_REFUSED` também pode significar que:

1. **O servidor não está rodando**
   - Se estiver em Vercel/Netlify: verifique se o deploy está ativo
   - Se estiver em servidor próprio: verifique se o serviço está rodando

2. **A porta está bloqueada**
   - Verifique firewall
   - Verifique se a porta 443 (HTTPS) está aberta

3. **O certificado SSL não está configurado**
   - O site precisa de HTTPS para funcionar com Supabase
   - Configure SSL no seu provedor de hospedagem

---

## 📝 Checklist Completo

- [ ] **Site URL** configurado no Supabase: `https://www.zkoficial.com.br`
- [ ] **Redirect URLs** adicionadas no Supabase
- [ ] **CORS Origins** configurado (se necessário)
- [ ] **Secret VITE_APP_URL** atualizado no Supabase
- [ ] **DNS** apontando corretamente
- [ ] **Servidor** rodando e acessível
- [ ] **SSL/HTTPS** configurado
- [ ] **Firewall** permitindo conexões na porta 443

---

## 🧪 Como Testar

1. **Teste o DNS:**
```bash
nslookup www.zkoficial.com.br
ping www.zkoficial.com.br
```

2. **Teste o acesso direto:**
   - Abra: `https://www.zkoficial.com.br`
   - Se funcionar, o problema é no Supabase
   - Se não funcionar, o problema é no DNS/servidor

3. **Teste o Supabase:**
   - Tente fazer login
   - Verifique se redireciona corretamente
   - Verifique o console do navegador (F12) para erros

---

## 🔗 Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg
- **Settings → API**: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api
- **Edge Functions Secrets**: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/functions

---

## ⚠️ Importante

- **Sempre use HTTPS** (não HTTP) para produção
- **Configure ambos**: `www.zkoficial.com.br` e `zkoficial.com.br`
- **Aguarde alguns minutos** após configurar DNS (pode levar até 48h, mas geralmente é rápido)
- **Teste em modo anônimo** para evitar cache do navegador

---

## 🆘 Se ainda não funcionar

1. Verifique os logs do Supabase:
   - **Settings** → **Logs** → **API Logs**
   - Procure por erros relacionados ao domínio

2. Verifique o console do navegador:
   - Pressione F12
   - Vá em **Console**
   - Procure por erros CORS ou de conexão

3. Verifique o certificado SSL:
   - Acesse: https://www.ssllabs.com/ssltest/
   - Digite: `www.zkoficial.com.br`
   - Verifique se o certificado está válido

