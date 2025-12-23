# 🔍 Diagnóstico: ERR_CONNECTION_REFUSED

## ⚠️ O que significa este erro?

`ERR_CONNECTION_REFUSED` significa que:
- O navegador tentou se conectar ao servidor
- O servidor **recusou a conexão** ou **não está respondendo**

**Isso NÃO é um problema do Supabase!** É um problema de:
- DNS não configurado
- Servidor não rodando
- Firewall bloqueando
- Site não deployado

---

## 🔍 Passo 1: Verificar se o DNS está configurado

### **Teste no PowerShell:**

```powershell
nslookup www.zkoficial.com.br
```

**Resultados possíveis:**

✅ **Se retornar um IP:**
```
Nome:    www.zkoficial.com.br
Address:  123.456.789.0
```
→ DNS está OK, problema é no servidor

❌ **Se retornar erro:**
```
*** Não foi possível encontrar www.zkoficial.com.br: Non-existent domain
```
→ **DNS não está configurado!** Configure primeiro.

---

## 🔍 Passo 2: Verificar se o servidor está no ar

### **Teste com ping:**

```powershell
ping www.zkoficial.com.br
```

**Resultados possíveis:**

✅ **Se responder:**
```
Resposta de 123.456.789.0: bytes=32 tempo=50ms TTL=54
```
→ Servidor está acessível, problema pode ser na porta/HTTPS

❌ **Se não responder:**
```
Tempo esgotado.
```
→ Servidor não está acessível ou firewall bloqueando

---

## 🔍 Passo 3: Onde está hospedado o site?

### **Opções comuns:**

#### **A) Vercel**
1. Acesse: https://vercel.com/dashboard
2. Verifique se há um projeto deployado
3. Verifique se o domínio está conectado
4. Verifique se o último deploy foi bem-sucedido

**Como conectar domínio na Vercel:**
1. Vá em: **Settings** → **Domains**
2. Adicione: `www.zkoficial.com.br`
3. Configure os registros DNS conforme instruções

---

#### **B) Netlify**
1. Acesse: https://app.netlify.com
2. Verifique se há um site publicado
3. Verifique se o domínio está conectado
4. Verifique se o deploy está ativo

**Como conectar domínio na Netlify:**
1. Vá em: **Domain settings**
2. Adicione: `www.zkoficial.com.br`
3. Configure os registros DNS conforme instruções

---

#### **C) Servidor Próprio/VPS**
1. Verifique se o servidor está rodando:
   ```bash
   # Se for Linux
   systemctl status nginx
   # ou
   systemctl status apache2
   ```

2. Verifique se a porta 443 (HTTPS) está aberta:
   ```bash
   netstat -tuln | grep 443
   ```

3. Verifique o firewall:
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   ```

---

## 🔍 Passo 4: Verificar configuração DNS

### **O que deve estar configurado no seu provedor de domínio:**

#### **Opção 1: Vercel**
```
Tipo: CNAME
Nome: www
Valor: cname.vercel-dns.com
```

#### **Opção 2: Netlify**
```
Tipo: CNAME
Nome: www
Valor: [seu-site].netlify.app
```

#### **Opção 3: Servidor Próprio**
```
Tipo: A
Nome: www
Valor: [IP do seu servidor]
```

---

## 🚨 Problemas Comuns e Soluções

### **1. DNS não propagado**
- **Sintoma:** `nslookup` não retorna IP
- **Solução:** Aguarde até 48 horas (geralmente é rápido, 5-30 minutos)
- **Como verificar:** Use https://dnschecker.org

### **2. Servidor não está rodando**
- **Sintoma:** `ping` não responde
- **Solução:** Inicie o servidor ou faça deploy

### **3. Firewall bloqueando**
- **Sintoma:** Servidor responde ao ping, mas não ao navegador
- **Solução:** Abra a porta 443 (HTTPS) no firewall

### **4. Certificado SSL não configurado**
- **Sintoma:** Site não carrega via HTTPS
- **Solução:** Configure SSL (Let's Encrypt, Cloudflare, etc.)

### **5. Domínio não conectado na plataforma**
- **Sintoma:** DNS OK, mas site não carrega
- **Solução:** Conecte o domínio na Vercel/Netlify/servidor

---

## 🧪 Teste Completo

Execute estes comandos no PowerShell e me envie os resultados:

```powershell
# 1. Verificar DNS
nslookup www.zkoficial.com.br

# 2. Verificar se responde
ping www.zkoficial.com.br

# 3. Verificar HTTPS (se tiver curl)
curl -I https://www.zkoficial.com.br
```

---

## 📋 Checklist de Diagnóstico

- [ ] **DNS configurado?** → Execute `nslookup www.zkoficial.com.br`
- [ ] **Servidor respondendo?** → Execute `ping www.zkoficial.com.br`
- [ ] **Site deployado?** → Verifique Vercel/Netlify/servidor
- [ ] **Domínio conectado?** → Verifique configurações da plataforma
- [ ] **SSL configurado?** → Verifique certificado HTTPS
- [ ] **Firewall aberto?** → Verifique porta 443

---

## 🆘 Próximos Passos

**Me informe:**

1. **Onde está hospedado?** (Vercel, Netlify, servidor próprio, etc.)
2. **Resultado do `nslookup`:** Copie e cole aqui
3. **Resultado do `ping`:** Copie e cole aqui
4. **O site já funcionou antes?** Ou é a primeira vez tentando acessar?

Com essas informações, posso ajudar melhor! 🚀

---

## 🔗 Links Úteis

- **Verificar DNS globalmente:** https://dnschecker.org
- **Verificar SSL:** https://www.ssllabs.com/ssltest/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Netlify Dashboard:** https://app.netlify.com

