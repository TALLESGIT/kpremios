# ✅ BACKEND CONFIGURADO - PRÓXIMOS PASSOS

## ✅ O QUE JÁ FOI FEITO

Você já configurou:
- ✅ `backend/socket-server/env.example` com suas credenciais
- ✅ `FRONTEND_URL=https://www.zkoficial.com.br/`
- ✅ `SUPABASE_URL` e `SUPABASE_ANON_KEY` configurados

---

## 📋 PRÓXIMOS PASSOS

### **PASSO 1: Renomear .env.example para .env** ⚠️ IMPORTANTE

O Node.js procura por `.env`, não `env.example`:

```bash
cd backend/socket-server

# Windows:
copy env.example .env

# Linux/Mac:
cp env.example .env
```

**Isso é necessário para o `dotenv` funcionar!**

---

### **PASSO 2: Testar Backend Localmente**

```bash
cd backend/socket-server

# Instalar dependências (primeira vez)
npm install

# Iniciar servidor
npm start
```

**Resultado esperado:**
```
🚀 Socket.io Server iniciado!
📡 Porta: 3001
🌐 Frontend URL: https://www.zkoficial.com.br/
✅ Pronto para receber conexões WebSocket
```

---

### **PASSO 3: Configurar Frontend (.env na raiz do projeto)**

Adicione no arquivo `.env` (na raiz, não na pasta backend):

```env
# URL do servidor Socket.io (para desenvolvimento local)
VITE_SOCKET_SERVER_URL=http://localhost:3001

# Quando fizer deploy na VPS, mude para:
# VITE_SOCKET_SERVER_URL=wss://backend.seudominio.com
```

---

### **PASSO 4: Testar Frontend + Backend**

1. **Iniciar backend:**
   ```bash
   cd backend/socket-server
   npm start
   ```

2. **Iniciar frontend (em outro terminal):**
   ```bash
   # Na raiz do projeto
   npm run dev
   ```

3. **Abrir 2 navegadores:**
   - Navegador 1: `http://localhost:5173/live/zktv`
   - Navegador 2: `http://localhost:5173/live/zktv`
   - Enviar mensagem no chat em um navegador
   - Ver aparecer no outro em tempo real via Socket.io

---

### **PASSO 5: Deploy na VPS** (Quando estiver testado)

1. **Compactar pasta:**
   ```bash
   # Windows: ZIP em backend/socket-server/ (excluir node_modules)
   # Linux/Mac:
   cd backend
   tar -czf socket-server.tar.gz socket-server/ --exclude=node_modules
   ```

2. **Enviar para VPS:**
   - Via FTP/SFTP, ou
   - Via SCP: `scp -r backend/socket-server usuario@IP-VPS:/home/usuario/`

3. **Na VPS:**
   ```bash
   cd socket-server
   
   # Renomear env.example para .env (se ainda não fez)
   cp env.example .env
   # Editar .env com credenciais (já está configurado)
   
   # Instalar Node.js (se ainda não tem)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Instalar dependências
   npm install
   
   # Instalar PM2 (gerenciador de processos)
   npm install -g pm2
   
   # Iniciar servidor em background
   pm2 start server.js --name socket-server
   pm2 save
   pm2 startup  # Seguir instruções para iniciar automaticamente
   ```

4. **Configurar firewall (abrir porta 3001):**
   ```bash
   sudo ufw allow 3001/tcp
   ```

5. **Testar se está funcionando:**
   ```bash
   # Na VPS
   curl http://localhost:3001/health
   # Deve retornar: {"status":"healthy","timestamp":"..."}
   ```

---

### **PASSO 6: Atualizar Frontend no Vercel**

1. **No Vercel:**
   - Settings → Environment Variables
   - Adicionar: `VITE_SOCKET_SERVER_URL` = `wss://IP-DA-VPS:3001`
   - Ou se tiver domínio: `wss://backend.seudominio.com`

2. **Redeploy no Vercel**

---

## ⚠️ IMPORTANTE: Atualizar FRONTEND_URL

No arquivo `backend/socket-server/.env`, verifique se `FRONTEND_URL` está correto:

**Atual:**
```env
FRONTEND_URL=https://www.zkoficial.com.br/
```

**Recomendado (sem barra no final):**
```env
FRONTEND_URL=https://www.zkoficial.com.br
```

E adicionar suporte para `*.vercel.app` também (se usar preview deployments):

```env
FRONTEND_URL=https://www.zkoficial.com.br,https://*.vercel.app
```

**OU** no código do `server.js`, o CORS já aceita `*.vercel.app` automaticamente, então pode deixar como está.

---

## 🎯 CHECKLIST RÁPIDO

- [ ] Renomear `env.example` para `.env` no backend
- [ ] Testar backend localmente (`npm start`)
- [ ] Adicionar `VITE_SOCKET_SERVER_URL` no `.env` do frontend
- [ ] Testar frontend + backend juntos (2 navegadores)
- [ ] Deploy na VPS (quando testado)
- [ ] Configurar `VITE_SOCKET_SERVER_URL` no Vercel
- [ ] Testar em produção

---

## ❓ DÚVIDAS?

**Problema: "Cannot find module 'dotenv'"**
- Solução: `cd backend/socket-server && npm install`

**Problema: "Port 3001 already in use"**
- Solução: Mude `PORT=3002` no `.env` ou pare outro processo na porta 3001

**Problema: "Connection refused"**
- Solução: Verifique se backend está rodando (`npm start`)

**Quer que eu migre os componentes React agora ou prefere testar o backend primeiro?**
