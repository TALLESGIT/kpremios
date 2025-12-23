# ⚡ Resumo Rápido - Configurar Domínio

## 🎯 O que fazer AGORA:

### **1. Configurar no Supabase Dashboard** (5 minutos)

Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api

#### **A) Site URL:**
- Encontre: **Site URL**
- Altere para: `https://www.zkoficial.com.br`
- Salve

#### **B) Redirect URLs:**
- Encontre: **Redirect URLs**
- Adicione (uma por linha):
```
https://www.zkoficial.com.br
https://www.zkoficial.com.br/**
https://zkoficial.com.br
https://zkoficial.com.br/**
```
- Salve

---

### **2. Atualizar Secret VITE_APP_URL** (2 minutos)

Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/functions

- Encontre: `VITE_APP_URL` ou `URL_do_aplicativo_VITE`
- Altere para: `https://www.zkoficial.com.br`
- Salve

---

### **3. Verificar se o site está no ar**

Abra no navegador: `https://www.zkoficial.com.br`

- ✅ **Se abrir**: Configure o Supabase (passos 1 e 2)
- ❌ **Se não abrir**: Problema é no DNS/servidor, não no Supabase

---

## ⚠️ IMPORTANTE:

O erro `ERR_CONNECTION_REFUSED` pode ser:

1. **DNS não configurado** → Configure no seu provedor de domínio
2. **Servidor não rodando** → Verifique se o site está deployado
3. **Supabase não configurado** → Siga os passos acima

---

## 🔍 Como descobrir qual é o problema:

### Teste 1: DNS
```bash
nslookup www.zkoficial.com.br
```
- Se retornar IP → DNS OK
- Se não retornar → Configure DNS primeiro

### Teste 2: Servidor
Abra: `https://www.zkoficial.com.br`
- Se abrir → Configure Supabase
- Se não abrir → Problema no servidor/DNS

---

## 📞 Onde está hospedado?

- **Vercel?** → Verifique se o deploy está ativo
- **Netlify?** → Verifique se o site está publicado
- **Servidor próprio?** → Verifique se o serviço está rodando

---

## ✅ Depois de configurar:

1. Aguarde 2-3 minutos
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Teste novamente: `https://www.zkoficial.com.br`
4. Tente fazer login

---

**Se ainda não funcionar, me avise qual teste falhou!**

