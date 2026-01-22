# 🚀 Guia Completo: WebSocket em Produção - Solução Definitiva

## 📋 Resumo do Problema

**Erro:** `Transport unknown` com `transport: undefined`

**Causa raiz:**
1. Socket.IO usando polling em produção (não funciona bem com proxy)
2. `map` do Nginx no lugar errado (deve estar no `nginx.conf`, não no site)
3. `NODE_ENV` não configurado corretamente no PM2
4. Frontend tentando usar polling como fallback

---

## ✅ SOLUÇÃO PASSO A PASSO

### PASSO 1: Configurar NODE_ENV no Backend

**Na VPS:**

```bash
cd /var/www/zkpremios-backend
nano .env
```

**Adicionar/atualizar:**

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://www.zkoficial.com.br,https://zkoficial.com.br
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Salvar e sair:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### PASSO 2: Configurar Map WebSocket no Nginx

**⚠️ CRÍTICO:** O `map` DEVE estar no `/etc/nginx/nginx.conf`, não no arquivo do site!

**Na VPS:**

```bash
nano /etc/nginx/nginx.conf
```

**Dentro do bloco `http {`, adicionar ANTES de qualquer `include`:**

```nginx
http {
    # Map para WebSocket upgrade (DEVE estar aqui!)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }
    
    # ... resto das configurações ...
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**Salvar, testar e recarregar:**

```bash
nginx -t
systemctl reload nginx
```

---

### PASSO 3: Atualizar Backend na VPS

**No seu PC (PowerShell):**

```powershell
# Enviar server.js atualizado
scp backend\socket-server\server.js root@76.13.82.48:/var/www/zkpremios-backend/server.js

# Enviar ecosystem.config.js
scp backend\socket-server\ecosystem.config.js root@76.13.82.48:/var/www/zkpremios-backend/
```

**Na VPS:**

```bash
cd /var/www/zkpremios-backend

# Usar ecosystem.config.js (recomendado)
pm2 delete zkpremios-socket
pm2 start ecosystem.config.js
pm2 save

# OU reiniciar normalmente
pm2 restart zkpremios-socket --update-env
pm2 save
```

---

### PASSO 4: Atualizar Nginx na VPS

**No seu PC (PowerShell):**

```powershell
# Enviar configuração atualizada (sem o map)
scp nginx-api.zkoficial.com.br.conf root@76.13.82.48:/etc/nginx/sites-available/api.zkoficial.com.br
```

**Na VPS:**

```bash
# Testar e recarregar
nginx -t
systemctl reload nginx
```

---

### PASSO 5: Aguardar Deploy do Frontend

O Vercel deve fazer deploy automático. Aguarde alguns minutos ou force um deploy.

---

### PASSO 6: Validar Tudo

**Na VPS:**

```bash
# 1. Verificar PM2
pm2 list
# Deve mostrar: status: online

# 2. Verificar logs (deve mostrar "Ambiente: production")
pm2 logs zkpremios-socket --lines 10 --nostream

# 3. Verificar NODE_ENV
pm2 env 0 | grep NODE_ENV
# Deve mostrar: NODE_ENV=production

# 4. Testar health check
curl http://localhost:3001/health
curl https://api.zkoficial.com.br/health

# 5. Verificar map no Nginx
nginx -T | grep -A 3 "map.*upgrade"
# Deve mostrar o map configurado
```

**No navegador:**

1. Abrir: `https://www.zkoficial.com.br/admin/live-stream`
2. F12 → Console
3. Deve aparecer: `✅ useSocket: Socket conectado!`
4. F12 → Network → WS
5. Deve mostrar: Status `101 Switching Protocols`

---

## 🔍 DEBUGGING

### Se ainda der erro "Transport unknown":

**1. Verificar logs do backend:**

```bash
pm2 logs zkpremios-socket --lines 0
```

**Deve mostrar:**
- `🔧 Ambiente: production` ✅
- `✅ Viewer conectado: [id]` ✅
- **NÃO** deve mostrar: `Transport unknown` ❌

**2. Verificar logs do Nginx:**

```bash
tail -f /var/log/nginx/api.zkoficial.com.br-error.log
```

**3. Testar WebSocket manualmente:**

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket
```

**Deve retornar:** `101 Switching Protocols`

**4. Verificar Chrome DevTools:**

- F12 → Network → WS
- Verificar Request Headers:
  - `Upgrade: websocket` ✅
  - `Connection: Upgrade` ✅
- Verificar Response:
  - Status: `101 Switching Protocols` ✅

---

## 📝 Checklist Final

- [ ] `NODE_ENV=production` no `.env`
- [ ] `map $http_upgrade` no `/etc/nginx/nginx.conf` (nível http)
- [ ] Backend atualizado com `transports: ['websocket']` em produção
- [ ] Frontend atualizado com `transports: ['websocket']` em produção
- [ ] PM2 rodando com `ecosystem.config.js` ou `--update-env`
- [ ] Nginx recarregado sem erros
- [ ] Health check funciona via HTTPS
- [ ] WebSocket conecta sem erros
- [ ] Logs mostram `Ambiente: production`
- [ ] Chrome DevTools mostra `101 Switching Protocols`

---

## 🎯 Resultado Esperado

Após seguir todos os passos:

✅ Socket.IO conecta em produção  
✅ WebSocket funciona via HTTPS/WSS  
✅ Nenhum erro "Transport unknown"  
✅ Backend preparado para streaming com muitos viewers  
✅ Logs mostram ambiente correto  

---

**Última atualização:** 2024
