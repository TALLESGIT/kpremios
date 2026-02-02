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

Use a URL do Socket na variável de ambiente (ex.: `VITE_SOCKET_URL` no Vite). Em produção: `https://api.zkoficial.com.br`.

### **Exemplo mínimo (chat):**

```typescript
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://api.zkoficial.com.br';
const socket = io(socketUrl, {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// Entrar na sala da stream
socket.emit('join-stream', { streamId });

socket.on('joined-stream', () => { /* pronto */ });
socket.on('viewer-count-updated', (data) => { /* data.count */ });

// Escutar novas mensagens
socket.on('new-message', (message) => {
  setMessages(prev => [...prev, message]);
});

// Enviar mensagem
socket.emit('chat-message', {
  streamId,
  userId: user?.id,
  message: 'Olá!',
  messageType: 'text',
  userName: user?.name
});

// Curtir mensagem
socket.emit('like-message', { streamId, messageId, userId: user?.id });
socket.on('message-liked', (data) => { /* atualizar UI */ });
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
- `like-message` - Curtir mensagem (`streamId`, `messageId`, `userId` ou `sessionId`)
- `chat-pin-link` - Fixar link no chat (admin)
- `chat-unpin-link` - Desfixar link
- `chat-get-pinned-link` - Obter link fixado
- `poll-create` / `poll:start` - Criar enquete
- `poll-update` - Atualizar enquete
- `poll-delete` - Encerrar/deletar enquete
- `poll-get-active` - Obter enquete ativa da stream
- `poll-get-results` - Obter resultados
- `poll-check-vote` - Verificar se usuário já votou
- `poll-vote` - Votar (`pollId`, `optionId`)

### **Servidor → Cliente:**

- `joined-stream` - Confirmação de entrada na stream
- `viewer-joined` - Outro viewer entrou (broadcast)
- `viewer-count-updated` - Contagem de viewers atualizada
- `viewer-count` - Resposta a `get-viewer-count`
- `new-message` - Nova mensagem no chat
- `message-liked` - Mensagem recebeu like
- `message-updated` / `message-deleted` - Mensagem editada/removida
- `new-vip-message` - Nova mensagem VIP
- `stream-updated` - Stream foi atualizada
- `stream-ended` - Transmissão encerrada
- `pinned-link-updated` - Link fixado atualizado
- `pinned-link-active` - Resposta a `chat-get-pinned-link`
- `poll-updated`, `poll:start`, `poll:end`, `poll:update`, `poll:vote` - Enquetes
- `poll-created`, `poll-deleted`, `poll-active`, `poll-results`, `poll-voted`, `poll-vote-updated`
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

## ⚠️ SQL obrigatório no Supabase

Para reduzir CPU e evitar o painel laranja, execute no **SQL Editor** do Supabase (ou via MCP Supabase `execute_sql`):

```sql
-- 1. Índice para busca de perfis (essencial para login/cache)
CREATE INDEX IF NOT EXISTS idx_users_id_fast ON users(id);

-- 2. Índice para mensagens da live (essencial para carregar histórico)
CREATE INDEX IF NOT EXISTS idx_chat_stream_perf ON live_chat_messages(stream_id, created_at DESC);
```

*(O `ALTER SYSTEM SET idle_in_transaction_session_timeout` não é suportado no Supabase gerido — ignore.)*

---

## 🧪 Teste de carga com usuários reais (850 clientes)

Para um teste de carga real com login/cadastro e depois limpeza:

1. **Criar 850 usuários de teste** (Auth + `public.users`). Requer `SUPABASE_SERVICE_ROLE_KEY` no `.env`:
   ```bash
   npm run create-load-test-users
   # ou: node create-load-test-users.js 850
   ```
   Gera o ficheiro `load-test-users.json` (não versionado).

2. **Rodar o load test** usando esses usuários (mensagens com `userId`/`userName` reais):
   ```bash
   node load-test.js 850 <streamId> https://api.zkoficial.com.br load-test-users.json
   ```
   Se omitir o último argumento, o script procura `load-test-users.json` na mesma pasta.

3. **Apagar os cadastros de teste** (mensagens, `public.users`, Auth):
   ```bash
   npm run delete-load-test-users
   # ou: node delete-load-test-users.js [pathUsersJson]
   ```

---

## 📝 Próximos Passos

1. ✅ Configurar `.env` com suas credenciais
2. ✅ Executar o SQL acima no Supabase
3. ✅ Testar localmente (`npm start`)
4. ✅ Deploy na VPS
5. ✅ Atualizar frontend para usar Socket.io
6. ✅ Configurar domínio/SSL (Nginx + Let's Encrypt)

---

**Dúvidas? Consulte a documentação completa em:** `ARQUITETURA_DEPLOY_BACKEND_VS_TUDO.md`
