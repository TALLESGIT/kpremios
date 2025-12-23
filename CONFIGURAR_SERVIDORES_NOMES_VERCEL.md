# 🔧 Configurar Servidores de Nomes da Vercel

## 📊 Situação Atual

✅ **Na Vercel:**
- Servidores de Nomes: **Vercel** ✅
- Registros DNS já configurados ✅
- Rede de Borda: **Ativo** ✅

❌ **No Provedor de Domínio:**
- Ainda usando servidores de nomes antigos
- DNS ainda aponta para IP antigo (162.240.81.81)

---

## 🎯 Solução: Usar Servidores de Nomes da Vercel

A Vercel já está gerenciando os DNS, mas você precisa **configurar os servidores de nomes da Vercel no seu provedor de domínio**.

---

## 🔍 Passo 1: Ver Servidores de Nomes da Vercel

1. **Na página que você está vendo**, procure por **"Servidores De Nomes"** ou **"Name Servers"**
2. **Anote os servidores de nomes** que a Vercel está usando

**Geralmente a Vercel usa algo como:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**OU pode mostrar:**
```
ns1.vercel-dns-017.com
ns2.vercel-dns-017.com
```

---

## 🔧 Passo 2: Configurar no Provedor de Domínio

### **Onde configurar:**

1. **Acesse o painel do seu provedor de domínio** (onde você comprou o domínio)
   - Exemplos: **Registro.br**, GoDaddy, Namecheap, etc.

2. **Vá em:** Configurações DNS / Name Servers / Servidores de Nomes

3. **Altere os servidores de nomes** para os da Vercel:

#### **Se a Vercel mostrar:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Configure no provedor:**
```
Servidor 1: ns1.vercel-dns.com
Servidor 2: ns2.vercel-dns.com
```

#### **Se a Vercel mostrar:**
```
ns1.vercel-dns-017.com
ns2.vercel-dns-017.com
```

**Configure no provedor:**
```
Servidor 1: ns1.vercel-dns-017.com
Servidor 2: ns2.vercel-dns-017.com
```

---

## 📋 Passo 3: Remover Configurações Antigas

### **No provedor de domínio:**

1. **Remova registros DNS antigos:**
   - ❌ **DELETE** qualquer registro A que aponte para `162.240.81.81`
   - ❌ **DELETE** registros CNAME antigos que não sejam da Vercel

2. **Altere os servidores de nomes:**
   - ❌ **Remova** servidores de nomes antigos
   - ✅ **Adicione** os servidores de nomes da Vercel

---

## ⚠️ Importante

### **Por que usar servidores de nomes da Vercel?**

- ✅ A Vercel gerencia os DNS automaticamente
- ✅ Não precisa configurar registros DNS manualmente
- ✅ A Vercel atualiza os registros automaticamente
- ✅ Mais fácil e confiável

### **O que acontece quando configurar?**

- Os DNS serão gerenciados pela Vercel
- Não precisa mais configurar registros DNS manualmente
- A Vercel cuida de tudo automaticamente

---

## 🧪 Passo 4: Verificar Propagação

Após configurar os servidores de nomes, aguarde **5-30 minutos** e execute:

```powershell
nslookup www.zkoficial.com.br
```

**Resultado esperado:**

✅ **Se funcionar:**
```
Nome:    www.zkoficial.com.br
Address: [IP da Vercel, não 162.240.81.81]
```

❌ **Se ainda mostrar 162.240.81.81:**
- Aguarde mais tempo (pode levar até 48h, mas geralmente é rápido)
- Verifique se configurou os servidores de nomes corretamente

---

## 📝 Checklist

- [ ] **Ver servidores de nomes na Vercel** (na página que você está vendo)
- [ ] **Anotar os servidores de nomes** da Vercel
- [ ] **Acessar painel do provedor de domínio**
- [ ] **Ir em Configurações DNS / Name Servers**
- [ ] **Alterar servidores de nomes** para os da Vercel
- [ ] **Remover registros DNS antigos** (162.240.81.81)
- [ ] **Salvar alterações**
- [ ] **Aguardar propagação** (5-30 minutos)
- [ ] **Testar:** `https://www.zkoficial.com.br`

---

## 🔍 Como Encontrar Servidores de Nomes na Vercel

Na página que você está vendo, procure por:

- **"Servidores De Nomes"** ou **"Name Servers"**
- Geralmente aparece na seção superior da página
- Pode mostrar algo como: `ns1.vercel-dns.com` e `ns2.vercel-dns.com`

---

## 🆘 Se Não Encontrar os Servidores de Nomes

1. **Procure na página atual** por "Servidores De Nomes" ou "Name Servers"
2. **Ou vá em:** Settings → Domains → [seu domínio] → Name Servers
3. **Ou entre em contato com suporte da Vercel**

---

## 📝 Resumo

1. ✅ Vercel já está gerenciando DNS
2. ⚠️ **Ação necessária:** Configurar servidores de nomes da Vercel no provedor de domínio
3. ❌ Remover registros DNS antigos (162.240.81.81)
4. ⏱️ Aguardar propagação (5-30 minutos)

---

## 🔗 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Verificar DNS globalmente:** https://dnschecker.org
- **Verificar propagação:** https://www.whatsmydns.net

---

**Me diga quais servidores de nomes aparecem na página (procure por "Servidores De Nomes" ou "Name Servers") e eu te ajudo a configurar!** 🚀

