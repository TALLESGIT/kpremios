# 🔍 Verificar Configuração Vercel

## 📊 Situação Atual

- ✅ **Hospedado em:** Vercel
- ✅ **Já funcionou antes:** Sim
- ❌ **Problema:** Site não está acessível
- ❌ **DNS apontando para:** `162.240.81.81` (IP direto, não Vercel)

---

## 🎯 O Problema

O DNS está apontando para um IP direto (`162.240.81.81`), mas **a Vercel não usa IPs fixos**!

A Vercel usa **registros CNAME** que apontam para domínios da Vercel, não para IPs.

---

## ✅ Solução: Configurar DNS Corretamente

### **Passo 1: Verificar Projeto na Vercel**

1. **Acesse:** https://vercel.com/dashboard
2. **Procure pelo projeto** (provavelmente chamado "ZKPremiosRaffleApplication" ou similar)
3. **Clique no projeto**
4. **Vá em:** **Settings** → **Domains**

### **Passo 2: Conectar Domínio na Vercel**

1. Na página **Domains**, clique em **Add Domain**
2. Digite: `www.zkoficial.com.br`
3. Clique em **Add**
4. A Vercel vai te mostrar um registro DNS para configurar

**Exemplo do que a Vercel vai mostrar:**
```
Tipo: CNAME
Nome: www
Valor: cname.vercel-dns.com
```

**OU pode mostrar:**
```
Tipo: A
Nome: @
Valor: 76.76.21.21
```

### **Passo 3: Configurar DNS no Provedor de Domínio**

1. **Acesse o painel do seu provedor de domínio** (onde você comprou o domínio)
2. **Vá em:** Configurações DNS / DNS Records / Zona DNS
3. **Configure conforme a Vercel indicou:**

#### **Se a Vercel pedir CNAME:**
```
Tipo: CNAME
Nome: www
Valor: cname.vercel-dns.com
TTL: 3600 (ou automático)
```

#### **Se a Vercel pedir A:**
```
Tipo: A
Nome: @ (ou deixar em branco)
Valor: [IP que a Vercel fornecer]
TTL: 3600 (ou automático)
```

### **Passo 4: Remover Registro DNS Antigo**

**IMPORTANTE:** Remova o registro que está apontando para `162.240.81.81`!

1. No painel DNS do seu provedor de domínio
2. Procure por registros que apontam para `162.240.81.81`
3. **Delete esses registros**
4. Adicione os novos registros que a Vercel pediu

---

## 🔍 Verificar Deploy Ativo

### **Passo 1: Verificar Último Deploy**

1. Na Vercel, vá em: **Deployments**
2. Verifique se há um deploy recente
3. Verifique se o status é **Ready** (verde)
4. Se não houver deploy ou estiver com erro, faça um novo deploy

### **Passo 2: Fazer Novo Deploy (se necessário)**

Se não houver deploy ativo ou se o último falhou:

1. **Opção A: Deploy via Git (recomendado)**
   ```bash
   git push origin master
   ```
   A Vercel vai fazer deploy automaticamente se estiver conectada ao GitHub

2. **Opção B: Deploy manual**
   - Na Vercel, clique em **Deployments**
   - Clique em **Redeploy** no último deploy
   - Ou faça um novo commit e push

---

## 📋 Checklist Completo

- [ ] **Acessar Vercel Dashboard:** https://vercel.com/dashboard
- [ ] **Encontrar o projeto**
- [ ] **Verificar se há deploy ativo** (Status: Ready)
- [ ] **Ir em Settings → Domains**
- [ ] **Adicionar domínio:** `www.zkoficial.com.br`
- [ ] **Copiar instruções DNS da Vercel**
- [ ] **Acessar painel do provedor de domínio**
- [ ] **Remover registros antigos** (que apontam para 162.240.81.81)
- [ ] **Adicionar novos registros** (conforme Vercel pediu)
- [ ] **Aguardar propagação DNS** (5-30 minutos)
- [ ] **Testar:** `https://www.zkoficial.com.br`

---

## 🧪 Como Verificar se Está Funcionando

### **Teste 1: Verificar DNS**

Após configurar o DNS, aguarde 5-30 minutos e execute:

```powershell
nslookup www.zkoficial.com.br
```

**Resultado esperado:**
- Se configurou CNAME: Deve mostrar `cname.vercel-dns.com`
- Se configurou A: Deve mostrar um IP da Vercel (não 162.240.81.81)

### **Teste 2: Verificar Site**

Após propagação DNS:
1. Abra: `https://www.zkoficial.com.br`
2. Deve carregar o site normalmente

---

## ⚠️ Importante

### **Por que o IP 162.240.81.81 não funciona?**

- A Vercel **não usa IPs fixos**
- A Vercel usa **load balancers** que mudam
- Você **deve usar CNAME ou A record** conforme a Vercel pedir
- **Nunca aponte diretamente para um IP** na Vercel

### **O que fazer com o IP antigo?**

- **Remova o registro DNS** que aponta para `162.240.81.81`
- Esse IP provavelmente era de um servidor antigo ou outro serviço
- Não é mais necessário

---

## 🆘 Se Ainda Não Funcionar

### **Verificar na Vercel:**

1. **Deploy está ativo?**
   - Vá em: Deployments
   - Status deve ser "Ready" (verde)

2. **Domínio está conectado?**
   - Vá em: Settings → Domains
   - Deve aparecer: `www.zkoficial.com.br` com status "Valid"

3. **DNS está correto?**
   - Execute: `nslookup www.zkoficial.com.br`
   - Deve mostrar domínio da Vercel, não IP direto

---

## 🔗 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Domains:** https://vercel.com/dashboard → Settings → Domains
- **Verificar DNS:** https://dnschecker.org
- **Verificar SSL:** https://www.ssllabs.com/ssltest/

---

## 📝 Resumo

1. ✅ Acesse Vercel Dashboard
2. ✅ Vá em Settings → Domains
3. ✅ Adicione: `www.zkoficial.com.br`
4. ✅ Copie instruções DNS
5. ✅ Configure DNS no provedor de domínio
6. ✅ Remova registros antigos (162.240.81.81)
7. ✅ Aguarde propagação (5-30 min)
8. ✅ Teste o site

---

**Depois de configurar, me avise se funcionou!** 🚀

