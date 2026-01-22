# 🔧 Corrigir HTTP/2 para WebSocket

## ❌ Problema Identificado

O Nginx está configurado com `http2`, mas **HTTP/2 não suporta upgrade de conexão para WebSocket**. Isso causa o erro:

```
{"code":0,"message":"Transport unknown"}
```

Os logs mostram:
- `upgrade: 'none'` (deveria ser `'websocket'`)
- `connection: 'close'` (deveria ser `'upgrade'`)

## ✅ Solução

Remover `http2` do server block do Nginx para permitir HTTP/1.1, que suporta WebSocket nativamente.

---

## 📋 Passo a Passo

### 1. Atualizar arquivo de configuração local

O arquivo `nginx-api.zkoficial.com.br.conf` já foi atualizado. Agora precisa ser enviado para a VPS.

### 2. Enviar para VPS (PowerShell)

```powershell
scp nginx-api.zkoficial.com.br.conf root@76.13.82.48:/etc/nginx/sites-available/api.zkoficial.com.br
```

### 3. Na VPS: Testar e recarregar

```bash
# Testar configuração
nginx -t

# Se OK, recarregar
systemctl reload nginx

# Verificar status
systemctl status nginx --no-pager -l | head -10
```

### 4. Verificar mudança

A linha deve estar assim (SEM `http2`):

```nginx
listen 443 ssl;
listen [::]:443 ssl;
```

**NÃO** assim:

```nginx
listen 443 ssl http2;  # ❌ ERRADO para WebSocket
```

---

## 🧪 Testar

### Teste 1: Via curl (deve retornar 101 Switching Protocols)

```bash
curl -v -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket 2>&1 | grep -E "HTTP|101|upgrade"
```

**Resultado esperado:**
```
< HTTP/1.1 101 Switching Protocols
< Upgrade: websocket
< Connection: upgrade
```

### Teste 2: No navegador

1. Abra o DevTools (F12)
2. Vá para a aba Network
3. Filtre por WS (WebSocket)
4. Recarregue a página
5. Deve aparecer uma conexão WebSocket com status 101

---

## 📊 Comparação

| Aspecto | HTTP/2 | HTTP/1.1 |
|---------|--------|----------|
| WebSocket Upgrade | ❌ Não suporta | ✅ Suporta |
| Multiplexing | ✅ Sim | ❌ Não |
| Performance geral | ✅ Melhor | ⚠️ Boa |
| **Para WebSocket** | ❌ **Não funciona** | ✅ **Funciona** |

**Conclusão:** Para uma API de WebSocket, HTTP/1.1 é necessário.

---

## 🔍 Verificar se funcionou

### Logs do backend

```bash
pm2 logs zkpremios-socket --lines 20
```

Deve mostrar:
- ✅ `upgrade: 'websocket'` (não mais `'none'`)
- ✅ `connection: 'upgrade'` (não mais `'close'`)

### Logs do Nginx

```bash
tail -f /var/log/nginx/api.zkoficial.com.br-access.log | grep socket.io
```

Deve mostrar:
- ✅ Status `101` (Switching Protocols)
- ✅ Não mais status `400`

---

## ⚠️ Nota Importante

Se você precisar de HTTP/2 para outras partes da aplicação, você pode:

1. **Opção A:** Manter HTTP/1.1 para todo o domínio (recomendado para WebSocket)
2. **Opção B:** Criar um subdomínio separado com HTTP/2 para outras APIs
3. **Opção C:** Usar um server block separado na mesma porta (mais complexo)

Para uma API de WebSocket, a **Opção A** é a mais simples e eficiente.

---

## ✅ Checklist

- [ ] Arquivo `nginx-api.zkoficial.com.br.conf` atualizado (sem `http2`)
- [ ] Arquivo enviado para VPS
- [ ] `nginx -t` passou sem erros
- [ ] `systemctl reload nginx` executado
- [ ] Teste com curl retorna 101
- [ ] Teste no navegador mostra conexão WebSocket
- [ ] Logs do backend mostram `upgrade: 'websocket'`
- [ ] Erro "Transport unknown" não aparece mais

---

## 🆘 Se ainda não funcionar

1. Verificar se o `map $http_upgrade $connection_upgrade` está no `nginx.conf`:
   ```bash
   nginx -T 2>/dev/null | grep -A 3 "map.*upgrade"
   ```

2. Verificar se o location `/socket.io/` está usando `$connection_upgrade`:
   ```bash
   grep -A 5 "location /socket.io/" /etc/nginx/sites-available/api.zkoficial.com.br
   ```

3. Verificar logs detalhados:
   ```bash
   tail -f /var/log/nginx/api.zkoficial.com.br-error.log
   pm2 logs zkpremios-socket --lines 0
   ```
