# 🔧 Configurar Socket.IO na Vercel

## ❌ Problema

Em produção na Vercel, o erro `xhr poll error` aparece porque o frontend não está conseguindo conectar ao backend Socket.IO.

## ✅ Solução

### 1. Configurar Variável de Ambiente na Vercel (Recomendado)

**No painel da Vercel:**

1. Acesse seu projeto
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   - **Name:** `VITE_SOCKET_SERVER_URL`
   - **Value:** `https://api.zkoficial.com.br`
   - **Environments:** Production, Preview, Development (todos)
4. Salve e faça redeploy

### 2. Verificar Código (Já Corrigido)

O código já foi atualizado para sempre usar `https://api.zkoficial.com.br` em produção, mas a variável de ambiente tem prioridade.

**Arquivo:** `src/hooks/useSocket.ts`

```typescript
// Agora sempre usa api.zkoficial.com.br em produção
if (isProduction) {
  return 'https://api.zkoficial.com.br';
}
```

### 3. Verificar CORS no Backend

O backend já está configurado para aceitar Vercel:

```javascript
// Verificar Vercel (regex)
if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
  return callback(null, true);
}
```

## 🧪 Testar

### 1. Verificar URL no Console do Navegador

Abra o DevTools (F12) e verifique:

```javascript
// Deve mostrar:
🔌 useSocket: URL do servidor Socket.IO: https://api.zkoficial.com.br
```

### 2. Verificar Requisições na Aba Network

1. Abra DevTools → Network
2. Filtre por `socket.io`
3. Deve aparecer:
   - `GET /socket.io/?EIO=4&transport=polling` → Status 200
   - Depois: `GET /socket.io/?EIO=4&transport=websocket&sid=...` → Status 101

### 3. Verificar Logs do Backend

Na VPS:

```bash
pm2 logs zkpremios-socket --lines 0
```

Deve mostrar:
- `📡 Requisição Socket.IO recebida:` com `origin: https://seu-app.vercel.app`
- `✅ Viewer conectado:` com `transport: 'polling'`
- `🔄 Socket ... fez upgrade para: websocket`

## ⚠️ Problemas Comuns

### Erro: "xhr poll error"

**Causas possíveis:**
1. URL incorreta → Verificar variável de ambiente na Vercel
2. CORS bloqueado → Verificar logs do backend
3. Nginx bloqueando → Verificar logs do Nginx

**Solução:**
1. Configurar `VITE_SOCKET_SERVER_URL=https://api.zkoficial.com.br` na Vercel
2. Fazer redeploy
3. Verificar logs do backend

### Erro: "CORS blocked"

**Causa:** Backend não está reconhecendo a origem da Vercel

**Solução:**
1. Verificar se o regex do CORS está correto no `server.js`
2. Verificar logs do backend para ver qual origem está sendo bloqueada
3. Adicionar a origem específica se necessário

### Erro: "Transport unknown"

**Causa:** Handshake polling falhou

**Solução:**
1. Verificar se o Nginx está permitindo requisições longas
2. Verificar timeouts no Nginx
3. Verificar logs do backend

## 📋 Checklist

- [ ] Variável `VITE_SOCKET_SERVER_URL` configurada na Vercel
- [ ] Valor: `https://api.zkoficial.com.br`
- [ ] Redeploy feito após configurar variável
- [ ] Console do navegador mostra URL correta
- [ ] Network mostra requisições para `api.zkoficial.com.br`
- [ ] Logs do backend mostram origem da Vercel
- [ ] Conexão estabelecida (polling → websocket)

## 🔍 Debug Avançado

### Verificar Variável de Ambiente no Build

Adicione temporariamente no código:

```typescript
console.log('🔍 Debug:', {
  envUrl: import.meta.env.VITE_SOCKET_SERVER_URL,
  finalUrl: SOCKET_SERVER_URL,
  hostname: window.location.hostname
});
```

### Testar Conexão Manualmente

No console do navegador:

```javascript
// Testar handshake polling
fetch('https://api.zkoficial.com.br/socket.io/?EIO=4&transport=polling', {
  method: 'GET',
  headers: {
    'Origin': window.location.origin
  }
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
```

**Resultado esperado:** JSON com `sid` (Session ID)

---

## ✅ Após Configurar

1. Faça redeploy na Vercel
2. Teste no navegador
3. Verifique logs do backend
4. O erro "xhr poll error" deve desaparecer
