# ✅ Checklist: Validação WebSocket em Produção

Este checklist garante que o backend Socket.IO está funcionando corretamente em produção com HTTPS/WSS.

## 📋 Pré-requisitos

- [ ] VPS com acesso SSH (root ou sudo)
- [ ] Domínio `api.zkoficial.com.br` apontando para o IP da VPS
- [ ] Nginx instalado e rodando
- [ ] Node.js 18+ instalado
- [ ] PM2 instalado globalmente
- [ ] Certificado SSL válido (Let's Encrypt ou Cloudflare)

---

## 1️⃣ Backend na VPS

### 1.1 Verificar Instalação

```bash
# Conectar na VPS
ssh root@76.13.82.48

# Verificar Node.js
node -v  # Deve ser 18+

# Verificar PM2
pm2 -v

# Verificar se o backend está rodando
pm2 list
```

### 1.2 Atualizar Código

```bash
# Navegar para o diretório do backend
cd /var/www/zkpremios-backend  # ou o caminho onde está o backend

# Fazer pull do código atualizado (se usar Git)
git pull

# OU transferir arquivo atualizado via SCP (do seu PC):
# scp backend/socket-server/server.js root@76.13.82.48:/var/www/zkpremios-backend/
```

### 1.3 Configurar Variáveis de Ambiente

```bash
# Copiar exemplo de .env
cp env.production.example .env

# Editar .env com suas credenciais
nano .env

# Verificar se todas as variáveis estão preenchidas:
# - PORT=3001
# - NODE_ENV=production
# - FRONTEND_URL=https://www.zkoficial.com.br,https://zkoficial.com.br
# - SUPABASE_URL=...
# - SUPABASE_SERVICE_ROLE_KEY=...
```

### 1.4 Instalar Dependências e Reiniciar

```bash
# Instalar/atualizar dependências
npm install

# Reiniciar PM2
pm2 restart socket-server

# OU se for a primeira vez:
# pm2 start server.js --name socket-server
# pm2 save
# pm2 startup
```

### 1.5 Verificar Logs

```bash
# Ver logs em tempo real
pm2 logs socket-server

# Verificar se não há erros
pm2 logs socket-server --lines 50 --err
```

**✅ Checklist Backend:**
- [ ] Backend iniciado sem erros
- [ ] Logs mostram "🚀 Socket.io Server iniciado!"
- [ ] Porta 3001 está sendo usada
- [ ] Nenhum erro de CORS nos logs

---

## 2️⃣ Nginx

### 2.1 Instalar Configuração

```bash
# Copiar configuração para sites-available
cp nginx-api.zkoficial.com.br.conf /etc/nginx/sites-available/api.zkoficial.com.br

# Criar symlink para sites-enabled
ln -s /etc/nginx/sites-available/api.zkoficial.com.br /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Se OK, recarregar Nginx
systemctl reload nginx
```

### 2.2 Configurar SSL (Let's Encrypt)

```bash
# Instalar Certbot (se ainda não tiver)
apt install certbot python3-certbot-nginx -y

# Obter certificado
certbot --nginx -d api.zkoficial.com.br

# Verificar renovação automática
certbot renew --dry-run
```

### 2.3 Verificar Configuração Nginx

```bash
# Verificar se Nginx está rodando
systemctl status nginx

# Ver logs de acesso
tail -f /var/log/nginx/api.zkoficial.com.br-access.log

# Ver logs de erro
tail -f /var/log/nginx/api.zkoficial.com.br-error.log
```

**✅ Checklist Nginx:**
- [ ] Configuração testada sem erros (`nginx -t`)
- [ ] Nginx recarregado com sucesso
- [ ] Certificado SSL válido
- [ ] Redirecionamento HTTP → HTTPS funcionando
- [ ] Headers WebSocket configurados (`Upgrade`, `Connection`)

---

## 3️⃣ Firewall

### 3.1 Verificar Portas Abertas

```bash
# Verificar se a porta 80 (HTTP) está aberta
ufw status | grep 80

# Verificar se a porta 443 (HTTPS) está aberta
ufw status | grep 443

# Se não estiverem abertas:
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

**✅ Checklist Firewall:**
- [ ] Porta 80 (HTTP) aberta
- [ ] Porta 443 (HTTPS) aberta
- [ ] Porta 3001 NÃO precisa estar aberta (apenas localhost via Nginx)

---

## 4️⃣ Testes de Conectividade

### 4.1 Health Check HTTP

```bash
# Testar endpoint de health check
curl https://api.zkoficial.com.br/health

# Deve retornar JSON com status "healthy"
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "environment": "production",
  "socketio": {
    "connected": 0,
    "rooms": 0
  }
}
```

### 4.2 Testar WebSocket (via Browser Console)

Abra o console do navegador em `https://www.zkoficial.com.br` e execute:

```javascript
// Testar conexão WebSocket
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

**✅ Checklist Testes:**
- [ ] Health check retorna status "healthy"
- [ ] WebSocket conecta sem erros no console
- [ ] Socket.id é retornado após conexão
- [ ] Nenhum erro CORS no console

---

## 5️⃣ Frontend

### 5.1 Verificar Variável de Ambiente

No arquivo `.env` do frontend (ou variáveis de ambiente da Vercel):

```bash
# Se usar Vite, adicione ao .env:
VITE_SOCKET_SERVER_URL=https://api.zkoficial.com.br
```

### 5.2 Verificar Build de Produção

```bash
# Build de produção
npm run build

# Verificar se não há erros
# Testar localmente (se possível)
npm run preview
```

**✅ Checklist Frontend:**
- [ ] Variável `VITE_SOCKET_SERVER_URL` configurada (ou detecção automática funcionando)
- [ ] Build de produção sem erros
- [ ] Frontend conecta ao backend em produção

---

## 6️⃣ Monitoramento

### 6.1 Verificar Conexões Ativas

```bash
# Na VPS, verificar conexões Socket.IO
pm2 logs socket-server | grep "Viewer conectado"

# Verificar health check
curl https://api.zkoficial.com.br/health | jq '.socketio'
```

### 6.2 Monitorar Recursos

```bash
# Ver uso de CPU/Memória do PM2
pm2 monit

# Ver status geral
pm2 status
```

**✅ Checklist Monitoramento:**
- [ ] Conexões sendo estabelecidas (logs mostram "Viewer conectado")
- [ ] Sem erros recorrentes nos logs
- [ ] Uso de recursos dentro do normal

---

## 7️⃣ Troubleshooting

### Problema: "websocket error" no frontend

**Possíveis causas:**
1. Nginx não está fazendo upgrade de conexão
   - ✅ Verificar headers `Upgrade` e `Connection` na config do Nginx
2. Certificado SSL inválido
   - ✅ Verificar: `openssl s_client -connect api.zkoficial.com.br:443`
3. Firewall bloqueando
   - ✅ Verificar: `ufw status`
4. Backend não está rodando
   - ✅ Verificar: `pm2 list` e `pm2 logs socket-server`

### Problema: CORS error

**Solução:**
- ✅ Verificar `FRONTEND_URL` no `.env` do backend
- ✅ Verificar função `corsOrigin` no `server.js`
- ✅ Verificar logs do backend para ver origem bloqueada

### Problema: Timeout de conexão

**Solução:**
- ✅ Verificar se Nginx tem timeouts longos configurados
- ✅ Verificar se firewall não está bloqueando
- ✅ Verificar se backend está acessível em `localhost:3001`

---

## 8️⃣ Validação Final

Execute todos os testes abaixo:

```bash
# 1. Health check
curl https://api.zkoficial.com.br/health

# 2. Verificar SSL
openssl s_client -connect api.zkoficial.com.br:443 -servername api.zkoficial.com.br

# 3. Testar WebSocket upgrade
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket
```

**✅ Validação Final:**
- [ ] Health check OK
- [ ] SSL válido e sem erros
- [ ] WebSocket upgrade funcionando
- [ ] Frontend conecta sem erros
- [ ] Chat/mensagens funcionando em tempo real

---

## 📞 Suporte

Se após seguir este checklist ainda houver problemas:

1. **Coletar logs:**
   ```bash
   pm2 logs socket-server --lines 100 > backend-logs.txt
   tail -100 /var/log/nginx/api.zkoficial.com.br-error.log > nginx-errors.txt
   ```

2. **Verificar configurações:**
   - Backend `.env`
   - Nginx config
   - Firewall rules

3. **Testar isoladamente:**
   - Backend direto: `curl http://localhost:3001/health`
   - Nginx proxy: `curl https://api.zkoficial.com.br/health`

---

**Última atualização:** 2024
**Versão:** 1.0.0
