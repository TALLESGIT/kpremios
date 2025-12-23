# 🔧 Configurar Servidores de Nomes da Vercel no Registrador

## 📊 Situação Atual

✅ **Vercel:**
- Pronta para gerenciar DNS ✅
- Servidores de nomes disponíveis ✅

❌ **Registrador (Empresa Terceirizada):**
- Ainda usando servidores de nomes antigos
- DNS apontando para IP antigo (162.240.81.81)

---

## 🎯 Solução: Configurar Servidores de Nomes da Vercel no Registrador

Como o domínio está registrado com uma empresa terceirizada, você precisa **configurar os servidores de nomes da Vercel no registrador do domínio**.

---

## 🔍 Passo 1: Ver Servidores de Nomes da Vercel

Na página da Vercel que você está vendo:

1. **Procure por um botão ou link** que diz algo como:
   - "Ver servidores de nomes"
   - "View name servers"
   - "Mostrar servidores de nomes"
   - Ou pode estar em uma seção expandível

2. **Clique para ver os servidores de nomes**

**Geralmente a Vercel mostra algo como:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**OU:**
```
ns1.vercel-dns-017.com
ns2.vercel-dns-017.com
```

---

## 🔧 Passo 2: Identificar o Registrador

### **Onde você comprou o domínio?**

- **Registro.br** (mais comum para .com.br)
- **GoDaddy**
- **Namecheap**
- **Outro**

---

## 📋 Passo 3: Configurar no Registrador

### **Se for Registro.br:**

1. **Acesse:** https://registro.br
2. **Faça login** na sua conta
3. **Vá em:** Meus Domínios → [seu domínio] → DNS
4. **Clique em:** "Alterar servidores DNS"
5. **Altere para:** Servidores da Vercel

**Configure assim:**
```
Servidor 1: ns1.vercel-dns.com
Servidor 2: ns2.vercel-dns.com
```

**OU conforme a Vercel mostrar:**
```
Servidor 1: ns1.vercel-dns-017.com
Servidor 2: ns2.vercel-dns-017.com
```

6. **Salve as alterações**

---

### **Se for GoDaddy:**

1. **Acesse:** https://www.godaddy.com
2. **Faça login**
3. **Vá em:** Meus Produtos → Domínios → [seu domínio]
4. **Clique em:** "DNS" ou "Gerenciar DNS"
5. **Vá em:** "Alterar servidores de nomes"
6. **Altere para:** Servidores da Vercel
7. **Salve**

---

### **Se for Namecheap:**

1. **Acesse:** https://www.namecheap.com
2. **Faça login**
3. **Vá em:** Domain List → [seu domínio] → Manage
4. **Vá em:** "Nameservers"
5. **Selecione:** "Custom DNS"
6. **Adicione:** Servidores da Vercel
7. **Salve**

---

### **Se for outro registrador:**

1. **Acesse o painel do registrador**
2. **Procure por:** "DNS", "Name Servers", "Servidores de Nomes"
3. **Altere para:** Servidores da Vercel
4. **Salve**

---

## ⚠️ Passo 4: Remover Registros DNS Antigos

### **No registrador:**

1. **Vá em:** Configurações DNS / DNS Records
2. **Remova registros antigos:**
   - ❌ **DELETE** qualquer registro A que aponte para `162.240.81.81`
   - ❌ **DELETE** registros CNAME antigos que não sejam da Vercel

**Importante:** Se você configurar os servidores de nomes da Vercel, os registros DNS antigos no registrador **não serão mais usados**, mas é bom removê-los para evitar confusão.

---

## 🧪 Passo 5: Verificar Propagação

Após configurar, aguarde **5-30 minutos** e execute:

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

## 📋 Checklist Completo

- [ ] **Ver servidores de nomes na Vercel** (clicar para expandir/ver)
- [ ] **Anotar os servidores de nomes** da Vercel
- [ ] **Identificar o registrador** (onde comprou o domínio)
- [ ] **Acessar painel do registrador**
- [ ] **Ir em Configurações DNS / Name Servers**
- [ ] **Alterar servidores de nomes** para os da Vercel
- [ ] **Remover registros DNS antigos** (162.240.81.81)
- [ ] **Salvar alterações**
- [ ] **Aguardar propagação** (5-30 minutos)
- [ ] **Testar:** `https://www.zkoficial.com.br`

---

## 🔍 Como Ver Servidores de Nomes na Vercel

Na página da Vercel:

1. **Procure por um botão/link** que diz:
   - "Ver servidores de nomes"
   - "View name servers"
   - "Mostrar servidores de nomes"
   - Ou pode estar em uma seção que precisa expandir

2. **Clique para ver**

3. **Anote os servidores** que aparecerem

---

## ⚠️ Importante

### **Por que configurar servidores de nomes?**

- ✅ A Vercel gerencia os DNS automaticamente
- ✅ Não precisa configurar registros DNS manualmente
- ✅ A Vercel atualiza os registros automaticamente
- ✅ Mais fácil e confiável

### **O que acontece quando configurar?**

- Os DNS serão gerenciados pela Vercel
- Não precisa mais configurar registros DNS manualmente
- A Vercel cuida de tudo automaticamente

---

## 🆘 Se Não Encontrar os Servidores de Nomes na Vercel

1. **Procure na página atual** por um botão/link para ver servidores
2. **Ou vá em:** Settings → Domains → [seu domínio] → Name Servers
3. **Ou entre em contato com suporte da Vercel**

---

## 📝 Resumo

1. ✅ Vercel está pronta para gerenciar DNS
2. ⚠️ **Ação necessária:** Ver servidores de nomes na Vercel
3. ⚠️ **Ação necessária:** Configurar esses servidores no registrador
4. ❌ Remover registros DNS antigos (162.240.81.81)
5. ⏱️ Aguardar propagação (5-30 minutos)

---

## 🔗 Links Úteis

- **Registro.br:** https://registro.br
- **GoDaddy:** https://www.godaddy.com
- **Namecheap:** https://www.namecheap.com
- **Verificar DNS globalmente:** https://dnschecker.org
- **Verificar propagação:** https://www.whatsmydns.net

---

**Me diga:**
1. **Quais servidores de nomes aparecem na Vercel?** (procure por um botão/link para ver)
2. **Qual é o registrador?** (Registro.br, GoDaddy, etc.)

**E eu te ajudo a configurar passo a passo!** 🚀

