# 🔄 GUIA DE MIGRAÇÃO: Supabase Realtime → Socket.io

## 📋 O QUE FOI CRIADO

### **1. Hooks Personalizados:**

- ✅ `src/hooks/useSocket.ts` - Hook base para Socket.io
- ✅ `src/hooks/useSocketChat.ts` - Hook específico para chat

### **2. Backend Socket.io:**

- ✅ `backend/socket-server/server.js` - Servidor completo
- ✅ `backend/socket-server/package.json` - Dependências
- ✅ `backend/socket-server/env.example` - Template de variáveis

### **3. Dependências:**

- ✅ `socket.io-client` adicionado ao `package.json` do frontend

---

## 🚀 PASSO A PASSO PARA MIGRAR

### **PASSO 1: Instalar Dependências**

```bash
# Frontend (na raiz do projeto)
npm install

# Backend (se quiser testar localmente)
cd backend/socket-server
npm install
```

---

### **PASSO 2: Configurar Variáveis de Ambiente**

#### **Frontend (.env):**

Adicione a URL do servidor Socket.io:

```env
# URL do servidor Socket.io (backend na VPS)
VITE_SOCKET_SERVER_URL=wss://backend.seudominio.com

# Ou para desenvolvimento local:
# VITE_SOCKET_SERVER_URL=http://localhost:3001
```

#### **Backend (.env na pasta socket-server):**

```env
PORT=3001
FRONTEND_URL=https://seu-site.vercel.app

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

### **PASSO 3: Migrar LiveChat.tsx**

**ANTES (Supabase Realtime):**

```typescript
// useEffect com supabase.channel()
useEffect(() => {
  const channel = supabase.channel(`live_chat_${streamId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'live_chat_messages',
      filter: `stream_id=eq.${streamId}`
    }, (payload) => {
      // Manipular mensagens
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [streamId]);
```

**DEPOIS (Socket.io):**

```typescript
import { useSocketChat } from '../../hooks/useSocketChat';

// No componente
const { messages, isConnected, sendMessage, loading } = useSocketChat({
  streamId,
  enabled: isActive
});

// Usar messages diretamente
// messages já vem atualizado em tempo real

// Enviar mensagem
sendMessage('Olá!');
```

---

### **PASSO 4: Migrar Stream Updates (PublicLiveStreamPage.tsx)**

**ANTES (Supabase Realtime):**

```typescript
useEffect(() => {
  const channel = supabase.channel(`public_stream_v2_${streamId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'live_streams',
      filter: `id=eq.${streamId}`
    }, (payload) => {
      const updated = payload.new as LiveStream;
      setStream(updated);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [streamId]);
```

**DEPOIS (Socket.io):**

```typescript
import { useSocket } from '../hooks/useSocket';

// No componente
const { socket, isConnected, joinStream, on, off } = useSocket({
  streamId,
  autoConnect: true
});

useEffect(() => {
  if (!isConnected || !socket) return;

  joinStream(streamId);

  // Escutar atualizações da stream
  const handleStreamUpdate = (data: { streamId: string; updates: any }) => {
    if (data.streamId === streamId) {
      setStream(prev => ({ ...prev, ...data.updates }));
    }
  };

  on('stream-updated', handleStreamUpdate);

  return () => {
    off('stream-updated', handleStreamUpdate);
  };
}, [isConnected, socket, streamId, joinStream, on, off]);
```

---

### **PASSO 5: Migrar VipMessageOverlay.tsx**

**ANTES (Supabase Realtime):**

```typescript
useEffect(() => {
  const channel = supabase.channel(`vip_overlay_${streamId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'live_chat_messages',
      filter: `stream_id=eq.${streamId}`
    }, (payload) => {
      // Processar mensagem VIP
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [streamId]);
```

**DEPOIS (Socket.io):**

```typescript
import { useSocket } from '../hooks/useSocket';

// No componente
const { socket, isConnected, joinStream, on, off } = useSocket({
  streamId,
  autoConnect: isActive
});

useEffect(() => {
  if (!isConnected || !socket || !isActive) return;

  joinStream(streamId);

  // Escutar mensagens VIP
  const handleVipMessage = (message: any) => {
    // Processar mensagem VIP (mesma lógica que tinha antes)
    if (message.message_type === 'tts' || isVipUser) {
      // Adicionar à fila de overlay
    }
  };

  on('new-vip-message', handleVipMessage);

  return () => {
    off('new-vip-message', handleVipMessage);
  };
}, [isConnected, socket, streamId, isActive, joinStream, on, off]);
```

---

## 📝 EXEMPLO COMPLETO: LiveChat.tsx MIGRADO

```typescript
import { useSocketChat } from '../../hooks/useSocketChat';

const LiveChat: React.FC<LiveChatProps> = ({ streamId, isActive = true }) => {
  const { user } = useAuth();
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  
  // ✅ NOVO: Usar useSocketChat em vez de supabase.channel()
  const { messages, isConnected, sendMessage, loading } = useSocketChat({
    streamId,
    enabled: isActive
  });

  // Mensagens já vêm atualizadas em tempo real!
  // Não precisa mais de useEffect para escutar postgres_changes

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // ✅ NOVO: Usar sendMessage do hook
    sendMessage(newMessage);
    setNewMessage('');
  };

  // Resto do código permanece igual...
  
  return (
    <div>
      {/* Lista de mensagens */}
      {messages.map(msg => (
        <div key={msg.id}>{msg.message}</div>
      ))}
      
      {/* Input para enviar */}
      <input
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
      />
      <button onClick={handleSendMessage}>
        {isConnected ? 'Enviar' : 'Conectando...'}
      </button>
    </div>
  );
};
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

### **Backend:**
- [ ] Criar pasta `backend/socket-server/` (já criada ✅)
- [ ] Configurar `.env` no backend com credenciais Supabase
- [ ] Testar backend localmente (`npm start`)
- [ ] Deploy na VPS
- [ ] Configurar domínio/SSL (Nginx + Let's Encrypt)

### **Frontend:**
- [ ] Instalar `socket.io-client` (já adicionado ao package.json ✅)
- [ ] Adicionar `VITE_SOCKET_SERVER_URL` no `.env`
- [ ] Migrar `LiveChat.tsx` para usar `useSocketChat`
- [ ] Migrar `PublicLiveStreamPage.tsx` para usar `useSocket`
- [ ] Migrar `VipMessageOverlay.tsx` para usar `useSocket`
- [ ] Testar localmente (backend rodando)
- [ ] Deploy no Vercel

### **Testes:**
- [ ] Testar chat em tempo real (múltiplos navegadores)
- [ ] Testar mensagens VIP
- [ ] Testar stream updates
- [ ] Testar com 10+ viewers simultâneos
- [ ] Verificar performance

---

## 🎯 PRÓXIMOS PASSOS

1. **Testar localmente:**
   - Iniciar backend: `cd backend/socket-server && npm start`
   - Iniciar frontend: `npm run dev`
   - Testar chat em 2 navegadores

2. **Deploy backend na VPS:**
   - Copiar pasta `backend/socket-server/` para VPS
   - Configurar `.env`
   - Iniciar com PM2

3. **Migrar componentes:**
   - Começar pelo `LiveChat.tsx` (mais simples)
   - Depois `PublicLiveStreamPage.tsx`
   - Por último `VipMessageOverlay.tsx`

4. **Deploy frontend:**
   - Adicionar `VITE_SOCKET_SERVER_URL` no `.env` do Vercel
   - Deploy normal (git push)

---

## ❓ DÚVIDAS?

**Quer que eu migre algum componente específico agora?**

Posso migrar:
- ✅ `LiveChat.tsx` completo
- ✅ `PublicLiveStreamPage.tsx` (stream updates)
- ✅ `VipMessageOverlay.tsx` (mensagens VIP)

**Só falar qual componente você quer migrar primeiro!** 🚀
