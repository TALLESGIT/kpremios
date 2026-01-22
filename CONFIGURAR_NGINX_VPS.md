# 🔧 Configurar Nginx para WebSocket - Passo a Passo

Este guia mostra como configurar o Nginx como proxy reverso para o backend Socket.IO com suporte a WebSocket.

## 📋 Pré-requisitos

- ✅ Nginx instalado na VPS
- ✅ Domínio `api.zkoficial.com.br` apontando para o IP da VPS
- ✅ Backend rodando em `localhost:3001`

---

## 🚀 Opção 1: Script Automatizado (Recomendado)

### No PowerShell do seu PC:

```powershell
cd C:\ZKPremiosRaffleApplication
.\configurar-nginx-vps.ps1
```

O script vai:
1. Enviar configuração para VPS
2. Criar symlink
3. Testar configuração
4. Recarregar Nginx
5. Verificar status

---

## 📝 Opção 2: Manual (Passo a Passo)

### PASSO 1: Enviar Configuração para VPS

**No PowerShell do seu PC:**

```powershell
scp nginx-api.zkoficial.com.br.conf root@76.13.82.48:/etc/nginx/sites-available/api.zkoficial.com.br
```

### PASSO 2: Criar Symlink

**Conecte na VPS:**

```powershell
ssh root@76.13.82.48
```

**Na VPS, execute:**

```bash
# Criar symlink para sites-enabled
ln -sf /etc/nginx/sites-available/api.zkoficial.com.br /etc/nginx/sites-enabled/api.zkoficial.com.br

# Verificar se foi criado
ls -la /etc/nginx/sites-enabled/ | grep api.zkoficial.com.br
```

### PASSO 3: Testar Configuração

```bash
# Testar sintaxe do Nginx
nginx -t
```

**Deve mostrar:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### PASSO 4: Recarregar Nginx

```bash
# Recarregar Nginx (sem downtime)
systemctl reload nginx

# OU reiniciar (com downtime mínimo)
systemctl restart nginx
```

### PASSO 5: Verificar Status

```bash
# Verificar se Nginx está rodando
systemctl status nginx

# Verificar se a porta 80 e 443 estão abertas
netstat -tuln | grep -E ':(80|443)'
```

---

## 🔒 Configurar SSL (Let's Encrypt)

### Se ainda não tem certificado SSL:

```bash
# Instalar Certbot (se ainda não tiver)
apt update
apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
certbot --nginx -d api.zkoficial.com.br

# Seguir as instruções:
# - Email para notificações
# - Aceitar termos
# - Redirecionar HTTP para HTTPS (recomendado: 2)
```

### Verificar Renovação Automática:

```bash
# Testar renovação (dry-run)
certbot renew --dry-run
```

---

## ✅ Testar Configuração

### 1. Testar HTTP (deve redirecionar para HTTPS):

```bash
curl -I http://api.zkoficial.com.br/health
```

**Deve retornar:** `301 Moved Permanently` ou `200 OK` (se SSL já estiver configurado)

### 2. Testar HTTPS:

```bash
curl https://api.zkoficial.com.br/health
```

**Deve retornar JSON:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "environment": "development",
  "socketio": {
    "connected": 0,
    "rooms": 0
  }
}
```

### 3. Testar WebSocket (do navegador):

Abra o console do navegador e execute:

```javascript
const socket = io('https://api.zkoficial.com.br', {
  transports: ['websocket'],
  withCredentials: true
});

socket.on('connect', () => {
  console.log('✅ Conectado!', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erro:', error);
});
```

---

## 🔍 Verificar Logs

### Logs de Acesso:

```bash
tail -f /var/log/nginx/api.zkoficial.com.br-access.log
```

### Logs de Erro:

```bash
tail -f /var/log/nginx/api.zkoficial.com.br-error.log
```

### Logs do Nginx (geral):

```bash
tail -f /var/log/nginx/error.log
```

---

## 🆘 Troubleshooting

### Problema: "502 Bad Gateway"

**Causa:** Backend não está rodando ou porta incorreta.

**Solução:**
```bash
# Verificar se backend está rodando
pm2 list

# Verificar se porta 3001 está acessível
curl http://localhost:3001/health

# Verificar configuração do upstream no Nginx
grep -A 3 "upstream" /etc/nginx/sites-available/api.zkoficial.com.br
```

### Problema: "WebSocket connection failed"

**Causa:** Headers WebSocket não configurados corretamente.

**Solução:**
- Verificar se `proxy_set_header Upgrade $http_upgrade;` está presente
- Verificar se `proxy_set_header Connection "upgrade";` está presente
- Verificar se `location /socket.io/` está configurado

### Problema: "SSL certificate error"

**Causa:** Certificado SSL não configurado ou inválido.

**Solução:**
```bash
# Verificar certificado
openssl s_client -connect api.zkoficial.com.br:443 -servername api.zkoficial.com.br

# Renovar certificado
certbot renew

# Recarregar Nginx
systemctl reload nginx
```

### Problema: "Connection refused"

**Causa:** Firewall bloqueando portas.

**Solução:**
```bash
# Verificar firewall
ufw status

# Abrir portas se necessário
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

---

## 📝 Verificar Configuração Completa

Execute na VPS para verificar tudo:

```bash
# 1. Verificar se Nginx está rodando
systemctl status nginx

# 2. Verificar configuração
nginx -t

# 3. Verificar se symlink existe
ls -la /etc/nginx/sites-enabled/ | grep api

# 4. Verificar se backend está rodando
pm2 list

# 5. Testar health check via Nginx
curl https://api.zkoficial.com.br/health

# 6. Verificar logs recentes
tail -20 /var/log/nginx/api.zkoficial.com.br-error.log
```

---

## ✅ Checklist Final

- [ ] Nginx instalado e rodando
- [ ] Configuração enviada para `/etc/nginx/sites-available/`
- [ ] Symlink criado em `/etc/nginx/sites-enabled/`
- [ ] `nginx -t` passou sem erros
- [ ] Nginx recarregado
- [ ] SSL configurado (Let's Encrypt)
- [ ] Health check funciona via HTTPS
- [ ] WebSocket conecta sem erros
- [ ] Logs não mostram erros

---

**Última atualização:** 2024
