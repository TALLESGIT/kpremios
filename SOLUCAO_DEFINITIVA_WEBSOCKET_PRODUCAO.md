# 🔧 Solução Definitiva: WebSocket em Produção

## 📊 Análise do Problema "Transport Unknown"

### O que significa "Transport unknown"?

O erro `Transport unknown` com `transport: undefined` ocorre quando:

1. **Socket.IO não consegue identificar o transporte da requisição**
   - A requisição chega sem os parâmetros esperados (`EIO`, `transport`)
   - O path não está sendo reconhecido
   - O upgrade de HTTP para WebSocket falha

2. **Por que aparece apenas em produção HTTPS?**
   - Em localhost: conexão direta, sem proxy
   - Em produção: requisição passa por Nginx → pode modificar headers
   - HTTPS/WSS: requer upgrade correto de conexão
   - Cloudflare (se ativo): pode interferir no upgrade

3. **Relação entre polling, websocket e proxy:**
   - **Polling**: Requisições HTTP normais (GET/POST)
   - **WebSocket**: Requisição HTTP com upgrade para WS
   - **Proxy reverso (Nginx)**: Deve fazer upgrade corretamente
   - **Cloudflare**: Pode bloquear upgrade se não configurado

---

## 1️⃣ AMBIENTE: NODE_ENV em Produção

### ❌ Por que `NODE_ENV=production` no terminal NÃO funciona?

Quando você executa `NODE_ENV=production pm2 restart`, o PM2 **não herda** essa variável para o processo filho. O PM2 precisa ser configurado explicitamente.

### ✅ Formas corretas de setar NODE_ENV:

#### Opção 1: Via `.env` (Recomendado)

```bash
# No arquivo .env na VPS
NODE_ENV=production
```

#### Opção 2: Via PM2 ecosystem.config.js

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'zkpremios-socket',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

Depois: `pm2 start ecosystem.config.js`

#### Opção 3: Via PM2 diretamente

```bash
pm2 restart zkpremios-socket --update-env
pm2 set zkpremios-socket NODE_ENV production
pm2 save
```

### ✅ Como confirmar que está em produção:

```bash
# No backend, adicione log:
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

# Ou via PM2:
pm2 env 0 | grep NODE_ENV
```

---

## 2️⃣ CORREÇÃO DO BACKEND

### Problemas identificados:

1. `transports: ['websocket', 'polling']` - Em produção, deve ser apenas `['websocket']`
2. CORS pode estar bloqueando
3. Path pode não estar sendo reconhecido

### Correções necessárias:

```javascript
// Em produção, usar APENAS websocket (sem polling)
const isProduction = NODE_ENV === 'production';
const io = new Server(server, {
  path: '/socket.io/',
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // CRÍTICO: Em produção, apenas websocket
  transports: isProduction ? ['websocket'] : ['websocket', 'polling'],
  // Desabilitar polling em produção
  allowUpgrades: !isProduction, // Em produção, não fazer upgrade (já é websocket)
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  serveClient: false
});
```

---

## 3️⃣ NGINX: Configuração Crítica

### Por que sem Nginx correto o WebSocket nunca conecta?

O Nginx **deve**:
1. Fazer upgrade de HTTP para WebSocket
2. Passar headers corretos (`Upgrade`, `Connection`)
3. Não modificar a requisição
4. Manter conexão aberta (timeouts altos)

### Configuração correta:

```nginx
# Map para upgrade (DEVE estar no nível http, não server)
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

location /socket.io/ {
    proxy_pass http://socketio_backend;
    proxy_http_version 1.1;
    
    # CRÍTICO: Headers de upgrade
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # Headers padrão
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts longos (CRÍTICO para WebSocket)
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # Desabilitar buffering
    proxy_buffering off;
    proxy_cache off;
}
```

---

## 4️⃣ FRONTEND: Conexão Correta

### Código correto:

```typescript
const isProduction = window.location.hostname !== 'localhost';

const socket = io('https://api.zkoficial.com.br', {
  path: '/socket.io/',
  // Em produção: apenas websocket
  transports: isProduction ? ['websocket'] : ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  timeout: 20000
});
```

---

## 5️⃣ CHECKLIST DE VALIDAÇÃO

### Backend:
- [ ] `NODE_ENV=production` no `.env`
- [ ] PM2 mostra `online`
- [ ] Logs mostram `🔧 Ambiente: production`
- [ ] Health check funciona: `curl http://localhost:3001/health`

### Nginx:
- [ ] `nginx -t` passa sem erros
- [ ] `map $http_upgrade` está configurado
- [ ] Headers `Upgrade` e `Connection` estão presentes
- [ ] Health check via HTTPS funciona: `curl https://api.zkoficial.com.br/health`

### WebSocket:
- [ ] Chrome DevTools → Network → WS → Status `101 Switching Protocols`
- [ ] Sem erros `Transport unknown`
- [ ] Socket conecta e recebe `socket.id`

---

## 6️⃣ DEBUGGING

### Chrome DevTools:
1. F12 → Network
2. Filtrar por "WS" (WebSocket)
3. Verificar:
   - Status: `101 Switching Protocols` ✅
   - Headers: `Upgrade: websocket` ✅
   - Request URL: `wss://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket`

### PM2 Logs:
```bash
pm2 logs zkpremios-socket --lines 0
# Deve mostrar: "✅ Viewer conectado: [socket-id]"
```

### Nginx Logs:
```bash
tail -f /var/log/nginx/api.zkoficial.com.br-access.log
# Deve mostrar requisições para /socket.io/
```

---

## 🎯 PRÓXIMOS PASSOS

1. Corrigir backend (transports em produção)
2. Corrigir Nginx (map no nível http)
3. Atualizar frontend
4. Configurar NODE_ENV corretamente
5. Testar e validar
