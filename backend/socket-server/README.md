# 🚀 Backend Socket.io - Servidor Realtime

Este é o backend Socket.io que substitui o Supabase Realtime para suportar **1000+ viewers** simultâneos.

## 📋 Requisitos

- **Node.js** 18+ instalado
- **Supabase** configurado (para database)
- **VPS** ou servidor (para deploy)

## 🔧 Instalação Local (Para Testar)

### 1. Instalar dependências:

```bash
cd backend/socket-server
npm install
```

### 2. Configurar variáveis de ambiente:

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
PORT=3001
FRONTEND_URL=https://seu-site.vercel.app

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 3. Iniciar servidor:

```bash
# Modo produção
npm start

# Modo desenvolvimento (com auto-reload)
npm run dev
```

O servidor estará rodando em: `http://localhost:3001`

---

## 📦 Deploy na VPS

### **Método 1: Copiar pasta manualmente** (Mais simples)

1. **Compactar a pasta:**
   ```bash
   # No seu computador, na pasta backend/
   tar -czf socket-server.tar.gz socket-server/
   ```

2. **Enviar para VPS:**
   ```bash
   # Usando SCP (ajuste IP, usuário e caminho)
   scp socket-server.tar.gz usuario@IP-DA-VPS:/home/usuario/
   ```

3. **Na VPS:**
   ```bash
   # Conectar via SSH
   ssh usuario@IP-DA-VPS
   
   # Extrair pasta
   tar -xzf socket-server.tar.gz
   cd socket-server
   
   # Instalar Node.js (se ainda não tiver)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Instalar dependências
   npm install
   
   # Configurar .env
   nano .env
   # Cole suas variáveis de ambiente
   
   # Iniciar servidor (em background com PM2)
   npm install -g pm2
   pm2 start server.js --name socket-server
   pm2 save
   pm2 startup
   ```

### **Método 2: Git Clone** (Se usar Git)

1. **Na VPS:**
   ```bash
   git clone seu-repositorio.git
   cd seu-repositorio/backend/socket-server
   npm install
   cp .env.example .env
   nano .env
   pm2 start server.js --name socket-server
   ```

---

## 🔌 Como Usar no Frontend

Substituir `supabase.channel()` por `socket.io`:

### **Antes (Supabase Realtime):**

```typescript
const channel = supabase.channel(`live_chat_${streamId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'live_chat_messages',
    filter: `stream_id=eq.${streamId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

### **Depois (Socket.io):**

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://backend.seudominio.com', {
  transports: ['websocket']
});

// Entrar na sala da stream
socket.emit('join-stream', { streamId });

// Escutar novas mensagens
socket.on('new-message', (message) => {
  setMessages(prev => [...prev, message]);
});

// Enviar mensagem
socket.emit('chat-message', {
  streamId,
  userId: user?.id,
  message: 'Olá!',
  userName: user?.name
});
```

---

## 🎯 Eventos Disponíveis

### **Cliente → Servidor:**

- `join-stream` - Entrar na sala da stream
- `leave-stream` - Sair da sala da stream
- `chat-message` - Enviar mensagem no chat
- `vip-message` - Enviar mensagem VIP
- `stream-update` - Atualizar stream
- `get-viewer-count` - Obter contagem de viewers

### **Servidor → Cliente:**

- `joined-stream` - Confirmação de entrada
- `new-message` - Nova mensagem no chat
- `new-vip-message` - Nova mensagem VIP
- `stream-updated` - Stream foi atualizada
- `viewer-count` - Contagem de viewers
- `error` - Erro

---

## 📊 Monitoramento

### **PM2 (Recomendado para produção):**

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs socket-server

# Reiniciar
pm2 restart socket-server

# Parar
pm2 stop socket-server
```

### **Health Check:**

Acesse: `http://seu-vps:3001/health`

---

## 🔒 Segurança

- ✅ CORS configurado apenas para seu frontend
- ✅ Variáveis de ambiente para credenciais
- ✅ Validação de dados no servidor
- ⚠️ **Configure firewall** na VPS (abrir apenas porta 3001)

---

## 📝 Próximos Passos

1. ✅ Configurar `.env` com suas credenciais
2. ✅ Testar localmente (`npm start`)
3. ✅ Deploy na VPS
4. ✅ Atualizar frontend para usar Socket.io
5. ✅ Configurar domínio/SSL (Nginx + Let's Encrypt)

---

**Dúvidas? Consulte a documentação completa em:** `ARQUITETURA_DEPLOY_BACKEND_VS_TUDO.md`
