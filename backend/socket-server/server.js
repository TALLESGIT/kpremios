// =====================================================
// BACKEND SOCKET.IO - SERVIDOR REALTIME
// =====================================================
// Este servidor substitui o Supabase Realtime para suportar 1000+ viewers
// Mantém integração com Supabase para database

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

// Configuração
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Processar FRONTEND_URL (pode ter múltiplas URLs separadas por vírgula)
const frontendOrigins = FRONTEND_URL.split(',')
  .map(url => url.trim())
  .filter(url => url.length > 0);

// Lista completa de origens permitidas
const allowedOrigins = [
  ...frontendOrigins,
  'https://*.vercel.app',
  /^https:\/\/.*\.vercel\.app$/,
  'http://localhost:5173',
  'http://localhost:3000'
];

// Inicializar Express e HTTP server
const app = express();
const server = http.createServer(app);

// Middleware CORS para permitir conexões do frontend
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Inicializar Socket.io com CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Inicializar Supabase
// ✅ IMPORTANTE: Usar SERVICE_ROLE_KEY para bypass RLS (backend precisa inserir dados)
// ⚠️ NUNCA exponha a SERVICE_ROLE_KEY no frontend!
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env');
  console.error('⚠️  Usando SUPABASE_ANON_KEY como fallback (pode ter problemas com RLS)');
  if (!process.env.SUPABASE_ANON_KEY) {
    process.exit(1);
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// =====================================================
// ROTAS HTTP (Para health check)
// =====================================================

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Socket.io Server está rodando!',
    version: '1.0.0',
    connectedClients: io.sockets.sockets.size
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// =====================================================
// SOCKET.IO - CONEXÕES E EVENTOS
// =====================================================

// Armazenar conexões por stream
const streamRooms = new Map(); // streamId -> Set<socketId>

// Flag para evitar broadcast duplicado quando atualizamos via Socket.io
const socketIoUpdates = new Set(); // pollId -> timestamp

io.on('connection', (socket) => {
  console.log(`✅ Viewer conectado: ${socket.id}`);

  // Viewer se junta à sala da stream
  socket.on('join-stream', async (data) => {
    const { streamId } = data;
    
    if (!streamId) {
      socket.emit('error', { message: 'streamId é obrigatório' });
      return;
    }

    try {
      // Entrar na sala da stream
      socket.join(`stream:${streamId}`);
      
      // Manter registro de viewers por stream
      if (!streamRooms.has(streamId)) {
        streamRooms.set(streamId, new Set());
      }
      streamRooms.get(streamId).add(socket.id);
      
      console.log(`👥 Viewer ${socket.id} entrou na stream ${streamId}`);
      
      // Confirmar entrada
      socket.emit('joined-stream', { streamId });
      
      // Notificar outros viewers (opcional - para contagem)
      socket.to(`stream:${streamId}`).emit('viewer-joined', { streamId });
    } catch (error) {
      console.error('❌ Erro ao entrar na stream:', error);
      socket.emit('error', { message: 'Erro ao entrar na stream' });
    }
  });

  // Viewer sai da sala da stream
  socket.on('leave-stream', (data) => {
    const { streamId } = data;
    
    if (streamId) {
      socket.leave(`stream:${streamId}`);
      
      if (streamRooms.has(streamId)) {
        streamRooms.get(streamId).delete(socket.id);
        if (streamRooms.get(streamId).size === 0) {
          streamRooms.delete(streamId);
        }
      }
      
      console.log(`👋 Viewer ${socket.id} saiu da stream ${streamId}`);
    }
  });

  // Chat: Viewer envia mensagem
  socket.on('chat-message', async (data) => {
    const { streamId, userId, message, messageType, userName } = data;
    
    if (!streamId || !message) {
      socket.emit('error', { message: 'streamId e message são obrigatórios' });
      return;
    }

    try {
      // ✅ SEMPRE buscar nome do usuário no banco quando userId estiver presente
      // Isso garante que usamos o nome correto mesmo se o frontend enviar nome errado
      let finalUserName = 'Anônimo';
      
      if (userId) {
        console.log(`🔍 Backend: Buscando nome do usuário para userId: ${userId}`);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, id')
          .eq('id', userId)
          .single();
        
        if (userError) {
          console.error(`❌ Erro ao buscar usuário:`, userError);
        }
        
        if (userData?.name) {
          finalUserName = userData.name;
          console.log(`✅ Backend: Nome do usuário encontrado: ${finalUserName} (ID: ${userData.id})`);
        } else {
          console.warn(`⚠️ Backend: Usuário não encontrado ou sem nome, usando userName do frontend ou "Anônimo"`);
          finalUserName = userName || 'Anônimo';
        }
      } else {
        // Usuário anônimo
        finalUserName = userName || 'Anônimo';
        console.log(`👤 Backend: Mensagem de usuário anônimo: ${finalUserName}`);
      }

      // Salvar mensagem no Supabase
      const { data: savedMessage, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: userId || null,
          message: message,
          message_type: messageType || 'text',
          user_name: finalUserName
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
        console.error('❌ Dados da mensagem:', { streamId, userId, message, messageType, userName, finalUserName });
        socket.emit('error', { 
          message: 'Erro ao enviar mensagem',
          details: error.message,
          code: error.code,
          hint: error.hint
        });
        return;
      }

      // Broadcast para TODOS os viewers da stream
      io.to(`stream:${streamId}`).emit('new-message', savedMessage);
      
      console.log(`💬 Mensagem enviada na stream ${streamId} por ${finalUserName} (userId: ${userId || 'null'})`);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      socket.emit('error', { message: 'Erro ao processar mensagem' });
    }
  });

  // Stream Updates: Notificar mudanças na stream
  socket.on('stream-update', async (data) => {
    const { streamId, updates } = data;
    
    if (!streamId) {
      socket.emit('error', { message: 'streamId é obrigatório' });
      return;
    }

    try {
      // Atualizar no Supabase
      const { error } = await supabase
        .from('live_streams')
        .update(updates)
        .eq('id', streamId);

      if (error) {
        console.error('❌ Erro ao atualizar stream:', error);
        socket.emit('error', { message: 'Erro ao atualizar stream' });
        return;
      }

      // Broadcast para TODOS os viewers da stream
      io.to(`stream:${streamId}`).emit('stream-updated', { streamId, updates });
      
      console.log(`📡 Stream ${streamId} atualizada`);
    } catch (error) {
      console.error('❌ Erro ao processar atualização:', error);
      socket.emit('error', { message: 'Erro ao processar atualização' });
    }
  });

  // VIP Messages: Enviar mensagem VIP (overlay)
  socket.on('vip-message', async (data) => {
    const { streamId, userId, message, messageType, userName, isVip } = data;
    
    if (!isVip) {
      socket.emit('error', { message: 'Apenas VIPs podem enviar mensagens VIP' });
      return;
    }

    if (!streamId || !message) {
      socket.emit('error', { message: 'streamId e message são obrigatórios' });
      return;
    }

    try {
      // Salvar no Supabase (se necessário)
      const { data: savedMessage, error } = await supabase
        .from('vip_messages')
        .insert({
          stream_id: streamId,
          user_id: userId,
          message: message,
          message_type: messageType || 'text',
          user_name: userName
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar mensagem VIP:', error);
        // Não bloquear, apenas logar
      }

      // Broadcast para TODOS os viewers (VIP messages aparecem para todos)
      io.to(`stream:${streamId}`).emit('new-vip-message', savedMessage || data);
      
      console.log(`👑 Mensagem VIP enviada na stream ${streamId} por ${userName}`);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem VIP:', error);
      socket.emit('error', { message: 'Erro ao processar mensagem VIP' });
    }
  });

  // Viewer Count: Obter contagem de viewers ativos
  socket.on('get-viewer-count', async (data) => {
    const { streamId } = data;
    
    if (!streamId) {
      socket.emit('error', { message: 'streamId é obrigatório' });
      return;
    }

    try {
      // Contar viewers conectados (na sala)
      const room = io.sockets.adapter.rooms.get(`stream:${streamId}`);
      const viewerCount = room ? room.size : 0;
      
      socket.emit('viewer-count', { streamId, count: viewerCount });
    } catch (error) {
      console.error('❌ Erro ao contar viewers:', error);
      socket.emit('error', { message: 'Erro ao contar viewers' });
    }
  });

  // =====================================================
  // LINKS FIXADOS (PINNED LINKS) - Handlers Socket.io
  // =====================================================

  // Fixar um link (ou mensagem com link)
  socket.on('chat-pin-link', async (data) => {
    const { streamId, userId, message, pinned_link, userName, userEmail } = data;
    
    if (!streamId || !pinned_link) {
      socket.emit('error', { message: 'streamId e pinned_link são obrigatórios' });
      return;
    }

    try {
      console.log(`📌 Backend: Fixando link na stream ${streamId}: ${pinned_link}`);

      // 1. Desfixar qualquer link/mensagem anterior
      await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);

      // 2. Criar nova mensagem fixada
      const { data: savedMessage, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: userId || null,
          message: message || 'Link compartilhado',
          pinned_link: pinned_link,
          is_pinned: true,
          user_name: userName || 'Admin',
          user_email: userEmail || null,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar link fixado:', error);
        socket.emit('error', { message: 'Erro ao fixar link: ' + error.message });
        return;
      }

      // 3. Broadcast para todos os viewers
      io.to(`stream:${streamId}`).emit('pinned-link-updated', savedMessage);
      
      console.log(`✅ Link fixado com sucesso: ${savedMessage.id}`);
    } catch (error) {
      console.error('❌ Erro ao processar chat-pin-link:', error);
      socket.emit('error', { message: 'Erro ao processar link fixado' });
    }
  });

  // Desfixar link
  socket.on('chat-unpin-link', async (data) => {
    const { streamId, messageId } = data;
    
    if (!streamId) {
      socket.emit('error', { message: 'streamId é obrigatório' });
      return;
    }

    try {
      console.log(`📌 Backend: Desfixando link na stream ${streamId}`);

      // Desfixar todas as mensagens fixadas na stream
      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);

      if (error) {
        console.error('❌ Erro ao desfixar link:', error);
        socket.emit('error', { message: 'Erro ao desfixar link: ' + error.message });
        return;
      }

      // Broadcast para todos os viewers
      io.to(`stream:${streamId}`).emit('pinned-link-updated', null);
      
      console.log(`✅ Link desfixado com sucesso`);
    } catch (error) {
      console.error('❌ Erro ao processar chat-unpin-link:', error);
      socket.emit('error', { message: 'Erro ao processar desfixar link' });
    }
  });

  // Obter link fixado atual
  socket.on('chat-get-pinned-link', async (data) => {
    const { streamId } = data;
    
    if (!streamId) {
      socket.emit('error', { message: 'streamId é obrigatório' });
      return;
    }

    try {
      const { data: pinned, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar link fixado:', error);
        socket.emit('error', { message: 'Erro ao buscar link fixado' });
        return;
      }

      socket.emit('pinned-link-active', pinned || null);
    } catch (error) {
      console.error('❌ Erro ao buscar link fixado:', error);
      socket.emit('error', { message: 'Erro ao buscar link fixado' });
    }
  });

  // =====================================================
  // ENQUETES (POLLS) - Handlers Socket.io
  // =====================================================

  // Criar enquete (admin apenas)
  socket.on('poll-create', async (data) => {
    const { streamId, question, options, userId } = data;
    
    if (!streamId || !question || !options || !Array.isArray(options)) {
      socket.emit('error', { message: 'streamId, question e options são obrigatórios' });
      return;
    }

    if (options.length < 2 || options.length > 6) {
      socket.emit('error', { message: 'Enquete deve ter entre 2 e 6 opções' });
      return;
    }

    try {
      // Desativar/desfixar outras enquetes fixadas antes de criar a nova
      await supabase
        .from('stream_polls')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true)
        .eq('is_active', true);

      // Criar nova enquete ativa e fixada
      const { data: newPoll, error } = await supabase
        .from('stream_polls')
        .insert({
          stream_id: streamId,
          created_by: userId || null,
          question: question.trim(),
          options: options.map((opt, idx) => ({ id: idx + 1, text: opt.text.trim() })),
          is_active: true,
          is_pinned: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar enquete:', error);
        socket.emit('error', { message: 'Erro ao criar enquete: ' + error.message });
        return;
      }

      // Marcar que esta criação veio do Socket.io (para evitar broadcast duplicado do Realtime)
      socketIoUpdates.add(newPoll.id);
      setTimeout(() => {
        socketIoUpdates.delete(newPoll.id);
      }, 2000); // Remover após 2 segundos

      // Pequeno delay para garantir que o banco foi atualizado antes do broadcast
      await new Promise(resolve => setTimeout(resolve, 100));

      // Broadcast para todos os viewers da stream
      io.to(`stream:${streamId}`).emit('poll-updated', {
        eventType: 'INSERT',
        poll: newPoll,
        oldPoll: null
      });

      socket.emit('poll-created', { poll: newPoll });
      console.log(`📊 Enquete criada na stream ${streamId}: ${newPoll.id}`);
    } catch (error) {
      console.error('❌ Erro ao processar criação de enquete:', error);
      socket.emit('error', { message: 'Erro ao criar enquete' });
    }
  });

  // Atualizar enquete (pin/unpin, ativar/desativar)
  socket.on('poll-update', async (data) => {
    const { pollId, updates, streamId } = data;
    
    console.log(`📥 Backend recebeu poll-update:`, { pollId, updates, streamId, socketId: socket.id });
    
    if (!pollId || !updates) {
      console.error('❌ Backend: Dados inválidos no poll-update');
      socket.emit('error', { message: 'pollId e updates são obrigatórios' });
      return;
    }

    try {
      // Buscar enquete atual para obter stream_id se não foi fornecido
      const { data: currentPoll } = await supabase
        .from('stream_polls')
        .select('*')
        .eq('id', pollId)
        .single();
      
      if (!currentPoll) {
        console.error(`❌ Backend: Enquete ${pollId} não encontrada`);
        socket.emit('error', { message: 'Enquete não encontrada' });
        return;
      }

      const finalStreamId = streamId || currentPoll.stream_id;
      
      if (!finalStreamId) {
        console.error(`❌ Backend: streamId não encontrado para enquete ${pollId}`);
        socket.emit('error', { message: 'streamId não encontrado' });
        return;
      }

      // Se for fixar (ativar exibição), desfixar outras primeiro
      if (updates.is_pinned === true) {
        console.log(`📌 Backend: Fixando enquete ${pollId} e desfixando outras na stream ${finalStreamId}`);
        // Desfixar outras enquetes da mesma stream
        await supabase
          .from('stream_polls')
          .update({ is_pinned: false })
          .eq('stream_id', finalStreamId)
          .neq('id', pollId);
        
        // Se a enquete estava inativa, ativar ao fixar
        if (currentPoll.is_active === false && updates.is_active === undefined) {
          updates.is_active = true;
          console.log(`🔄 Backend: Ativando enquete ${pollId} automaticamente ao fixar`);
        }
      }

      // Se for desativar, desfixar também
      if (updates.is_active === false) {
        updates.is_pinned = false;
        console.log(`🔄 Backend: Desativando e desfixando enquete ${pollId}`);
      }

      // Atualizar enquete
      const { data: updatedPoll, error } = await supabase
        .from('stream_polls')
        .update(updates)
        .eq('id', pollId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar enquete:', error);
        socket.emit('error', { message: 'Erro ao atualizar enquete: ' + error.message });
        return;
      }
      
      console.log(`📊 Enquete atualizada no banco: ${pollId}, streamId: ${finalStreamId}, is_pinned: ${updatedPoll?.is_pinned}, is_active: ${updatedPoll?.is_active}`);
      
      // Marcar que esta atualização veio do Socket.io (para evitar broadcast duplicado do Realtime)
      socketIoUpdates.add(pollId);
      setTimeout(() => {
        socketIoUpdates.delete(pollId);
      }, 2000); // Remover após 2 segundos
      
      // Pequeno delay para garantir que o banco foi atualizado antes do broadcast
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (finalStreamId) {
        // Buscar enquete atualizada novamente para garantir que temos os dados mais recentes
        const { data: freshPoll } = await supabase
          .from('stream_polls')
          .select('*')
          .eq('id', pollId)
          .single();
        
        if (freshPoll) {
          // Broadcast para todos os viewers da stream (incluindo o próprio socket que fez a atualização)
          io.to(`stream:${finalStreamId}`).emit('poll-updated', {
            eventType: 'UPDATE',
            poll: freshPoll,
            oldPoll: currentPoll
          });
          const roomSize = io.sockets.adapter.rooms.get(`stream:${finalStreamId}`)?.size || 0;
          console.log(`📡 Broadcast enviado para stream ${finalStreamId} (${roomSize} viewers)`);
          
          // Resposta individual para o socket que fez a requisição
          socket.emit('poll-updated', { poll: freshPoll });
          console.log(`✅ Resposta poll-updated enviada para socket ${socket.id}`);
        } else {
          console.error('❌ Enquete não encontrada após atualização');
          socket.emit('error', { message: 'Enquete não encontrada após atualização' });
        }
      } else {
        console.warn(`⚠️ streamId não encontrado para enquete ${pollId}`);
        socket.emit('error', { message: 'streamId não encontrado' });
      }
    } catch (error) {
      console.error('❌ Erro ao processar atualização de enquete:', error);
      socket.emit('error', { message: 'Erro ao atualizar enquete' });
    }
  });

  // Deletar enquete
  socket.on('poll-delete', async (data) => {
    const { pollId, streamId } = data;
    
    console.log(`🗑️ Backend recebeu poll-delete:`, { pollId, streamId, socketId: socket.id });
    
    if (!pollId) {
      socket.emit('error', { message: 'pollId é obrigatório' });
      return;
    }

    try {
      // Buscar enquete para obter stream_id se não foi fornecido
      const { data: currentPoll } = await supabase
        .from('stream_polls')
        .select('stream_id, is_active, is_pinned')
        .eq('id', pollId)
        .single();
      
      if (!currentPoll) {
        console.error(`❌ Backend: Enquete ${pollId} não encontrada para deleção`);
        socket.emit('error', { message: 'Enquete não encontrada' });
        return;
      }

      const finalStreamId = streamId || currentPoll.stream_id;
      
      console.log(`🗑️ Backend deletando enquete ${pollId} da stream ${finalStreamId}`);

      // Deletar enquete (votos serão deletados em cascata via DB)
      const { error } = await supabase
        .from('stream_polls')
        .delete()
        .eq('id', pollId);

      if (error) {
        console.error('❌ Erro ao deletar enquete:', error);
        socket.emit('error', { message: 'Erro ao deletar enquete: ' + error.message });
        return;
      }
      
      console.log(`🗑️ Enquete deletada do banco: ${pollId}, streamId: ${finalStreamId}`);
      
      // Marcar que esta deleção veio do Socket.io (para evitar broadcast duplicado do Realtime)
      socketIoUpdates.add(pollId);
      setTimeout(() => {
        socketIoUpdates.delete(pollId);
      }, 2000); // Remover após 2 segundos
      
      // Pequeno delay para garantir que o banco foi atualizado antes do broadcast
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (finalStreamId) {
        // Broadcast para todos os viewers da stream
        io.to(`stream:${finalStreamId}`).emit('poll-updated', {
          eventType: 'DELETE',
          poll: null,
          oldPoll: currentPoll
        });
        const roomSize = io.sockets.adapter.rooms.get(`stream:${finalStreamId}`)?.size || 0;
        console.log(`📡 Broadcast de deleção enviado para stream ${finalStreamId} (${roomSize} viewers)`);
      }

      // Resposta individual para o socket que fez a requisição
      socket.emit('poll-deleted', { pollId });
      console.log(`✅ Resposta poll-deleted enviada para socket ${socket.id}`);
    } catch (error) {
      console.error('❌ Erro ao processar deleção de enquete:', error);
      socket.emit('error', { message: 'Erro ao deletar enquete' });
    }
  });

  // Obter enquete ativa e fixada
  socket.on('poll-get-active', async (data) => {
    const { streamId } = data;
    
    console.log(`📥 Backend recebeu poll-get-active para stream: ${streamId}`);
    
    if (!streamId) {
      console.error('❌ Backend: streamId não fornecido no poll-get-active');
      socket.emit('error', { message: 'streamId é obrigatório' });
      return;
    }

    try {
      const { data: poll, error } = await supabase
        .from('stream_polls')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar enquete ativa:', error);
        socket.emit('error', { message: 'Erro ao buscar enquete: ' + error.message });
        return;
      }

      console.log(`🔍 Enquete ativa encontrada para stream ${streamId}:`, poll ? { id: poll.id, question: poll.question, is_pinned: poll.is_pinned, is_active: poll.is_active } : 'nenhuma');
      socket.emit('poll-active', { poll: poll || null });
      console.log(`✅ Resposta poll-active enviada para socket ${socket.id}`);
    } catch (error) {
      console.error('❌ Erro ao processar busca de enquete:', error);
      socket.emit('error', { message: 'Erro ao buscar enquete' });
    }
  });

  // Obter resultados da enquete
  socket.on('poll-get-results', async (data) => {
    const { pollId } = data;
    
    if (!pollId) {
      socket.emit('error', { message: 'pollId é obrigatório' });
      return;
    }

    try {
      const { data: resultsData, error } = await supabase.rpc('get_poll_results', {
        p_poll_id: pollId
      });

      if (error) {
        console.error('❌ Erro ao buscar resultados:', error);
        socket.emit('error', { message: 'Erro ao buscar resultados' });
        return;
      }

      socket.emit('poll-results', {
        pollId,
        results: resultsData?.results || [],
        totalVotes: resultsData?.total_votes || 0
      });
    } catch (error) {
      console.error('❌ Erro ao processar resultados:', error);
      socket.emit('error', { message: 'Erro ao buscar resultados' });
    }
  });

  // Verificar se usuário já votou
  socket.on('poll-check-vote', async (data) => {
    const { pollId, userId, sessionId } = data;
    
    if (!pollId) {
      socket.emit('error', { message: 'pollId é obrigatório' });
      return;
    }

    try {
      const { data: hasVoted, error } = await supabase.rpc('has_user_voted', {
        p_poll_id: pollId,
        p_user_id: userId || null,
        p_session_id: userId ? null : sessionId
      });

      if (error) {
        console.error('❌ Erro ao verificar voto:', error);
        socket.emit('error', { message: 'Erro ao verificar voto' });
        return;
      }

      let userVote = null;
      if (hasVoted) {
        // Buscar qual opção o usuário votou
        const { data: voteData } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', pollId)
          .eq(userId ? 'user_id' : 'session_id', userId || sessionId)
          .single();

        if (voteData) {
          userVote = voteData.option_id;
        }
      }

      socket.emit('poll-vote-status', {
        pollId,
        hasVoted: hasVoted || false,
        userVote
      });
    } catch (error) {
      console.error('❌ Erro ao processar verificação de voto:', error);
      socket.emit('error', { message: 'Erro ao verificar voto' });
    }
  });

  // Votar em enquete
  socket.on('poll-vote', async (data) => {
    const { pollId, optionId, userId, sessionId } = data;
    
    if (!pollId || !optionId) {
      socket.emit('error', { message: 'pollId e optionId são obrigatórios' });
      return;
    }

    try {
      const { data: voteResult, error } = await supabase.rpc('vote_on_poll', {
        p_poll_id: pollId,
        p_option_id: optionId,
        p_user_id: userId || null,
        p_session_id: userId ? null : sessionId
      });

      if (error) {
        console.error('❌ Erro ao votar:', error);
        socket.emit('error', { message: 'Erro ao votar: ' + error.message });
        return;
      }

      if (!voteResult?.success) {
        socket.emit('poll-vote-error', { 
          message: voteResult?.error || 'Erro ao votar' 
        });
        return;
      }

      // Buscar stream_id da enquete para broadcast
      const { data: pollData } = await supabase
        .from('stream_polls')
        .select('stream_id')
        .eq('id', pollId)
        .single();

      if (pollData?.stream_id) {
        // Broadcast resultados atualizados para todos os viewers da stream
        io.to(`stream:${pollData.stream_id}`).emit('poll-vote-updated', {
          pollId,
          results: voteResult.results || [],
          totalVotes: voteResult.total_votes || 0
        });
      }

      socket.emit('poll-voted', {
        pollId,
        optionId,
        results: voteResult.results || [],
        totalVotes: voteResult.total_votes || 0
      });

      console.log(`🗳️ Voto registrado na enquete ${pollId}, opção ${optionId}`);
    } catch (error) {
      console.error('❌ Erro ao processar voto:', error);
      socket.emit('error', { message: 'Erro ao votar' });
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`❌ Viewer desconectado: ${socket.id}`);
    
    // Remover de todas as salas
    for (const [streamId, sockets] of streamRooms.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        streamRooms.delete(streamId);
      }
    }
  });
});

// =====================================================
// LISTEN PARA MUDANÇAS NO SUPABASE (Realtime → Socket.io)
// =====================================================

// Escutar mudanças no Supabase Realtime e broadcast via Socket.io
// Isso permite que o backend escute mudanças e notifique os clientes

// ✅ CANAL PARA ESCUTAR ATUALIZAÇÕES DE MENSAGENS (likes, pins, etc.)
const chatMessagesChannel = supabase
  .channel('socket-chat-messages-updates')
  .on('postgres_changes', {
    event: '*', // Escutar INSERT, UPDATE e DELETE
    schema: 'public',
    table: 'live_chat_messages'
  }, (payload) => {
    const data = payload.new || payload.old;
    const eventType = payload.eventType;
    
    if (!data || !data.stream_id) return;

    console.log(`📡 Realtime Chat: Evento ${eventType} na stream ${data.stream_id}`);

    // Se a mensagem for ou era fixada, notificar mudança de pinned-link
    if (data.is_pinned || (payload.old && payload.old.is_pinned)) {
      console.log(`📌 Mudança em mensagem FIXADA via Realtime: ${data.id}`);
      io.to(`stream:${data.stream_id}`).emit('pinned-link-updated', data.is_pinned ? data : null);
    }

    // Broadcast para todos os viewers da stream (mensagens normais)
    if (eventType === 'INSERT') {
      // Ignorar se veio do socket handler (opcional, new-message já é enviado)
      // Mas para garantir redundância e suporte a inserts externos (webhooks/bot):
      io.to(`stream:${data.stream_id}`).emit('new-message', data);
    } else if (eventType === 'UPDATE') {
      io.to(`stream:${data.stream_id}`).emit('message-updated', data);
    } else if (eventType === 'DELETE') {
      io.to(`stream:${data.stream_id}`).emit('message-deleted', {
        messageId: data.id,
        streamId: data.stream_id
      });
    }
  })
  .subscribe();

console.log('✅ Canal Realtime configurado para atualizações de mensagens (likes, pins, etc.)');

// Canal para escutar mudanças em match_pools (bolões)
const poolChannel = supabase
  .channel('socket-pool-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'match_pools'
  }, (payload) => {
    console.log('📊 Mudança detectada em match_pools:', payload.eventType, payload.new?.id);
    
    // Buscar live_stream_id para identificar a stream
    const pool = payload.new || payload.old;
    if (pool?.live_stream_id) {
      // Broadcast para todos os viewers da stream
      io.to(`stream:${pool.live_stream_id}`).emit('pool-updated', {
        eventType: payload.eventType, // INSERT, UPDATE, DELETE
        pool: payload.new || null,
        oldPool: payload.old || null
      });
      
      console.log(`📡 Pool atualizado broadcast para stream ${pool.live_stream_id}`);
    }
  })
  .subscribe();

// Canal para escutar mudanças em pool_bets (apostas)
const poolBetsChannel = supabase
  .channel('socket-pool-bets-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'pool_bets'
  }, async (payload) => {
    console.log('🎲 Mudança detectada em pool_bets:', payload.eventType, payload.new?.id);
    
    // Buscar pool_id para identificar a stream
    const bet = payload.new || payload.old;
    if (bet?.pool_id) {
      // Buscar live_stream_id do pool
      const { data: poolData } = await supabase
        .from('match_pools')
        .select('live_stream_id')
        .eq('id', bet.pool_id)
        .single();
      
      if (poolData?.live_stream_id) {
        // Broadcast para todos os viewers da stream
        io.to(`stream:${poolData.live_stream_id}`).emit('pool-bet-updated', {
          eventType: payload.eventType, // INSERT, UPDATE, DELETE
          bet: payload.new || null,
          oldBet: payload.old || null,
          poolId: bet.pool_id
        });
        
        console.log(`📡 Pool bet atualizado broadcast para stream ${poolData.live_stream_id}`);
      }
    }
  })
  .subscribe();

console.log('✅ Canais Realtime do Supabase configurados para bolões');

// Canal para escutar mudanças em stream_polls (enquetes)
// ⚠️ NOTA: Este canal é apenas para mudanças feitas diretamente no banco (fora do Socket.io)
// Mudanças via Socket.io já fazem broadcast diretamente, então não precisamos duplicar
const pollChannel = supabase
  .channel('socket-polls-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'stream_polls'
  }, (payload) => {
    const poll = payload.new || payload.old;
    const pollId = poll?.id;
    
    console.log('📊 Mudança detectada em stream_polls (via Realtime):', payload.eventType, pollId);
    
    // ⚠️ IMPORTANTE: Verificar se esta atualização veio do Socket.io
    // Se sim, não fazer broadcast duplicado (o Socket.io já fez)
    if (pollId && socketIoUpdates.has(pollId)) {
      console.log(`⏭️ Ignorando broadcast duplicado do Realtime para poll ${pollId} (já foi broadcastado via Socket.io)`);
      return;
    }
    
    if (poll?.stream_id) {
      // Broadcast apenas se for uma mudança externa (não via Socket.io)
      // O handler Socket.io já faz broadcast, então este é apenas backup
      io.to(`stream:${poll.stream_id}`).emit('poll-updated', {
        eventType: payload.eventType, // INSERT, UPDATE, DELETE
        poll: payload.new || null,
        oldPoll: payload.old || null
      });
      
      console.log(`📡 Enquete atualizada broadcast (Realtime) para stream ${poll.stream_id}`);
    }
  })
  .subscribe();

// Canal para escutar mudanças em poll_votes (votos)
const pollVotesChannel = supabase
  .channel('socket-poll-votes-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'poll_votes'
  }, async (payload) => {
    console.log('🗳️ Novo voto detectado em poll_votes:', payload.new?.id);
    
    const vote = payload.new;
    if (vote?.poll_id) {
      // Buscar stream_id da enquete
      const { data: pollData } = await supabase
        .from('stream_polls')
        .select('stream_id')
        .eq('id', vote.poll_id)
        .single();
      
      if (pollData?.stream_id) {
        // Buscar resultados atualizados da enquete
        const { data: resultsData, error: resultsError } = await supabase.rpc('get_poll_results', {
          p_poll_id: vote.poll_id
        });
        
        if (!resultsError && resultsData?.success) {
          // Broadcast resultados atualizados para todos os viewers da stream
          io.to(`stream:${pollData.stream_id}`).emit('poll-vote-updated', {
            pollId: vote.poll_id,
            results: resultsData.results || [],
            totalVotes: resultsData.total_votes || 0
          });
          
          console.log(`📡 Voto atualizado broadcast para stream ${pollData.stream_id}, poll ${vote.poll_id}`);
        }
      }
    }
  })
  .subscribe();

console.log('✅ Canais Realtime do Supabase configurados para enquetes e votos');

// Exemplo de função para notificar mudanças na stream (pode ser chamada via webhook)
app.post('/webhook/stream-update', async (req, res) => {
  try {
    const { streamId, updates } = req.body;
    
    if (!streamId) {
      return res.status(400).json({ error: 'streamId é obrigatório' });
    }

    // Broadcast para todos os viewers da stream
    io.to(`stream:${streamId}`).emit('stream-updated', { streamId, updates });
    
    res.json({ success: true, message: 'Atualização enviada' });
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

server.listen(PORT, () => {
  console.log('🚀 Socket.io Server iniciado!');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`✅ Pronto para receber conexões WebSocket`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});
