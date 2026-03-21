// =====================================================
// BACKEND SOCKET.IO - SERVIDOR REALTIME
// =====================================================
// Este servidor substitui o Supabase Realtime para suportar 1000+ viewers
// Mantém integração com Supabase para database

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: true
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const cors = require('cors');
const { spawn } = require('child_process');

// =====================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO (ORDEM CRÍTICA)
// =====================================================

// ✅ CRÍTICO: Inicializar Express e HTTP server PRIMEIRO
const app = express();
const server = http.createServer(app);

// Configuração
console.log('📂 Backend CWD:', process.cwd());
console.log('📂 Backend Dirname:', __dirname);
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log('🌐 Frontend URL configurada:', FRONTEND_URL);
console.log('🔧 Ambiente:', NODE_ENV);

// Processar FRONTEND_URL (pode ter múltiplas URLs separadas por vírgula)
const frontendOrigins = FRONTEND_URL.split(',')
  .map(url => url.trim())
  .filter(url => url.length > 0);

// Função customizada para validar origem CORS
const corsOrigin = (origin, callback) => {
  // Permitir requisições sem origem (mobile apps, Postman, etc)
  if (!origin) {
    return callback(null, true);
  }

  // Lista de origens permitidas (strings exatas)
  const allowedExactOrigins = [
    ...frontendOrigins,
    'https://www.zkoficial.com.br',
    'https://zkoficial.com.br',
    'https://localhost',
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];

  // Verificar origem exata
  if (allowedExactOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Verificar subdomínios de zkoficial.com.br (regex)
  if (/^https:\/\/[a-zA-Z0-9-]+\.zkoficial\.com\.br$/.test(origin)) {
    return callback(null, true);
  }

  // Verificar Vercel (regex)
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
    return callback(null, true);
  }

  // Em desenvolvimento, permitir qualquer localhost (http ou https)
  if (!isProduction && /^(http|https):\/\/localhost(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  // Rejeitar origem não permitida
  console.warn(`⚠️ CORS: Origem bloqueada: ${origin}`);
  callback(new Error('Not allowed by CORS'));
};

// =====================================================
// AUTOMAÇÃO: SINCRONIZAÇÃO DE DADOS DE FUTEBOL
// =====================================================
function runFootballSync() {
  console.log('⚽ [Automação] Iniciando sincronização de dados de futebol...');

  // Tentar encontrar o script em locais comuns (Local vs VPS)
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'scripts', 'sync-football-data.js'), // Local: backend/socket-server/..
    path.join(__dirname, 'scripts', 'sync-football-data.js'),             // VPS: ao lado do server.js
    path.join(__dirname, '..', 'scripts', 'sync-football-data.js')        // Alternativo
  ];

  const fs = require('fs');
  let syncScriptPath = possiblePaths.find(p => fs.existsSync(p));

  if (!syncScriptPath) {
    console.error('❌ [Automação] Erro: Script de sincronização não encontrado em nenhum dos locais:', possiblePaths);
    return;
  }

  const child = spawn('node', [syncScriptPath], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ [Automação] Sincronização concluída com sucesso.');
    } else {
      console.error(`❌ [Automação] Sincronização falhou com código: ${code}`);
    }
  });
}

// Agendar para rodar a cada 6 horas
const SYNC_INTERVAL = 6 * 60 * 60 * 1000;
setInterval(runFootballSync, SYNC_INTERVAL);

// Executar uma vez na inicialização após um pequeno delay para não sobrecarregar o boot
setTimeout(runFootballSync, 10000);

// Middleware de log para depurar origens e requisições Socket.IO
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const path = req.path;

  // Log detalhado para requisições Socket.IO
  if (path && path.includes('socket.io')) {
    console.log(`📡 Requisição Socket.IO recebida:`, {
      method: req.method,
      path: req.path,
      fullUrl: req.url,
      origin: origin || 'none',
      upgrade: req.headers.upgrade || 'none',
      connection: req.headers.connection || 'none',
      host: req.headers.host || 'none',
      query: req.query,
      transport: req.query.transport || 'none',
      eio: req.query.EIO || 'none'
    });
  } else if (origin) {
    console.log(`📡 Requisição recebida da origem: ${origin}`);
  }
  next();
});

// Middleware CORS para permitir conexões do frontend
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Inicializar Socket.io com CORS e configurações otimizadas para produção
// ✅ CRÍTICO: Em produção, usar APENAS websocket (sem polling)
// Polling causa problemas com proxy reverso e não é necessário em produção
const io = new Server(server, {
  path: '/socket.io/', // Path explícito para Socket.IO
  cors: {
    origin: true, // Permitir todas as origens temporariamente para depurar
    methods: ['GET', 'POST'],
    credentials: true
  },
  // ✅ CRÍTICO: Forçar apenas websocket para evitar problemas de sticky sessions no cluster
  transports: ['websocket'],
  // Permitir upgrade (embora forçando websocket ele nem deva tentar polling)
  allowUpgrades: false,
  // Configurações para conexões longas (streaming)
  pingTimeout: 60000, // 60 segundos
  pingInterval: 25000, // 25 segundos
  // Compatibilidade com versões antigas do Socket.IO
  allowEIO3: true,
  // Timeout para handshake
  connectTimeout: 45000,
  // Não servir o cliente Socket.IO (usar CDN no frontend)
  serveClient: false
});

// =====================================================
// REDIS ADAPTER (Para Clustering e Alta Disponibilidade)
// =====================================================
// ✅ CRÍTICO: Necessário para sincronizar eventos entre múltiplos processos (CPU cores)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('❌ Redis Pub Client Error:', err));
subClient.on('error', (err) => console.error('❌ Redis Sub Client Error:', err));

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  console.log('📡 Redis Adapter conectado e integrado ao Socket.IO');
  io.adapter(createAdapter(pubClient, subClient));
}).catch(err => {
  console.error('❌ Falha ao conectar no Redis (Clustering desativado):', err);
});

// Inicializar Supabase
// ✅ IMPORTANTE: Usar SERVICE_ROLE_KEY para bypass RLS (backend precisa inserir dados)
// ⚠️ NUNCA exponha a SERVICE_ROLE_KEY no frontend!
// ✅ Escalabilidade: Para conexões PostgreSQL diretas use pooler (porta 6543) com
//    ?pgbouncer=true&connection_limit=20. O cliente supabase-js usa REST; reduzimos
//    carga com batch insert, cache e throttle.
//     carga com batch insert, cache e throttle.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env');
  console.error('⚠️  Usando SUPABASE_ANON_KEY como fallback (pode ter problemas com RLS)');
  if (!process.env.SUPABASE_ANON_KEY) {
    process.exit(1);
  }
}

const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ✅ NOVO: Wrapper resiliente que usa cache quando Supabase falha
const SupabaseWrapper = require('./supabase-wrapper');
const cache = require('./resilient-cache');
const supabaseWrapper = new SupabaseWrapper(supabase);

// =====================================================
// ROTAS HTTP (Para health check)
// =====================================================

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Socket.io Server está rodando!',
    version: '1.0.0',
    environment: NODE_ENV,
    connectedClients: io.sockets.sockets.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  const connectedClients = io.sockets.sockets.size;
  const rooms = Array.from(io.sockets.adapter.rooms.keys());
  const streamRoomsCount = rooms.filter(room => room.startsWith('stream:')).length;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    socketio: {
      connected: io.engine.clientsCount,
      rooms: streamRoomsCount,
      transports: io.engine.transports
    },
    server: {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    },
    cache: supabaseWrapper.getStats(),
    supabase: {
      healthy: supabaseWrapper.isHealthy()
    },
    liveStreamsCache: {
      cached: !!liveStreamsCache,
      age: liveStreamsCache ? Math.round((Date.now() - liveStreamsCacheTime) / 1000) + 's' : 'n/a',
      count: liveStreamsCache?.length || 0
    }
  });
});

// ✅ NOVA ROTA: Buscar live streams ativas (com cache)
// Reduz 95% das requisições ao Supabase
app.get('/api/live-streams/active', async (req, res) => {
  try {
    const streams = await getActiveLiveStreams();
    res.json({
      success: true,
      data: streams,
      cached: (Date.now() - liveStreamsCacheTime) < LIVE_STREAMS_CACHE_TTL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao buscar live streams:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar live streams',
      message: error.message
    });
  }
});

// ✅ NOVA ROTA: Iniciar transmissão (Chamada pelo ZK Studio)
app.post('/api/live/start', async (req, res) => {
  try {
    let { streamId, channelName, hlsUrl } = req.body;

    // Se não veio streamId, mas veio channelName (comum no ZK Studio), tentar resolver
    if (!streamId && channelName) {
      console.log(`🔍 Resolvendo streamId para o canal: ${channelName}`);
      const { data: existingStream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('channel_name', channelName)
        .maybeSingle();

      if (existingStream) {
        streamId = existingStream.id;
        console.log(`✅ Canal encontrado! ID: ${streamId}`);
      } else {
        // Se o canal não existe (ex: primeira vez rodando com ZkPremios), criar automaticamente
        console.log(`✨ Canal "${channelName}" não existe. Criando novo registro...`);
        const { data: newStream, error: createError } = await supabase
          .from('live_streams')
          .insert({
            channel_name: channelName,
            title: channelName, // Título inicial igual ao nome do canal
            is_active: true,
            started_at: new Date().toISOString(),
            hls_url: hlsUrl || null
          })
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Erro ao criar canal automático:', createError);
          return res.status(500).json({ success: false, error: 'Erro ao criar canal: ' + createError.message });
        }

        streamId = newStream.id;
        console.log(`✅ Novo canal criado com ID: ${streamId}`);

        // Em caso de criação, já retornamos sucesso pois is_active já foi setado
        res.json({ success: true, message: 'Canal criado e transmissão iniciada', streamId });

        // Broadcast via Socket.io
        io.emit('live-start', { streamId, hlsUrl, channelName });
        return;
      }
    }

    if (!streamId) {
      return res.status(400).json({ success: false, error: 'streamId ou channelName é obrigatório' });
    }

    console.log(`📺 Iniciando transmissão: ${streamId}, HLS: ${hlsUrl}`);

    // Atualizar no Supabase
    const { error } = await supabase
      .from('live_streams')
      .update({
        is_active: true,
        hls_url: hlsUrl || null,
        started_at: new Date().toISOString()
      })
      .eq('id', streamId);

    if (error) {
      console.error('❌ Erro ao iniciar live no Supabase:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Invalidar cache
    liveStreamsCache = null;
    liveStreamsCacheTime = 0;

    // Broadcast via Socket.io
    io.emit('live-start', { streamId, hlsUrl, channelName });
    io.to(`stream:${streamId}`).emit('stream-updated', {
      streamId,
      updates: { is_active: true, hls_url: hlsUrl },
      eventType: 'UPDATE'
    });

    res.json({ success: true, message: 'Transmissão iniciada com sucesso', streamId });
  } catch (error) {
    console.error('❌ Erro ao processar /api/live/start:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ NOVA ROTA: Parar transmissão (Chamada pelo ZK Studio)
app.post('/api/live/stop', async (req, res) => {
  try {
    let { streamId, channelName } = req.body;

    // Se não veio streamId, resolver via channelName
    if (!streamId && channelName) {
      const { data: existingStream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('channel_name', channelName)
        .maybeSingle();

      if (existingStream) {
        streamId = existingStream.id;
      }
    }

    if (!streamId) {
      // Se não encontramos o streamId, apenas retornamos sucesso pois não há o que parar
      return res.json({ success: true, message: 'Nada para parar (stream não encontrado)' });
    }

    console.log(`🛑 Parando transmissão: ${streamId}`);

    // Atualizar no Supabase
    const { error } = await supabase
      .from('live_streams')
      .update({
        is_active: false
      })
      .eq('id', streamId);

    if (error) {
      console.error('❌ Erro ao parar live no Supabase:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Invalidar cache
    liveStreamsCache = null;
    liveStreamsCacheTime = 0;

    // Broadcast via Socket.io
    io.emit('live-stop', { streamId, channelName });
    io.to(`stream:${streamId}`).emit('stream-ended', {
      streamId,
      message: 'A transmissão foi encerrada'
    });

    res.json({ success: true, message: 'Transmissão encerrada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao processar /api/live/stop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SOCKET.IO - CONEXÕES E EVENTOS
// =====================================================

// Armazenar conexões por stream
const streamRooms = new Map(); // streamId -> Set<socketId>
const lastViewerCountByStream = new Map(); // streamId -> count (para logar só quando mudar)

// Flag para evitar broadcast duplicado quando atualizamos via Socket.io
const socketIoUpdates = new Set(); // pollId -> timestamp

// Flag para evitar broadcast duplicado de mensagens de chat quando enviamos via Socket.io
const socketIoChatMessages = new Set(); // messageId -> timestamp

// ✅ Write-Behind: buffer de mensagens para batch insert (reduz 90% das escritas)
const messageBuffer = [];
const MESSAGE_FLUSH_INTERVAL_MS = 4000; // 3 a 5 segundos

// Flush do buffer de mensagens a cada 3–5 s (uma única escrita em lote)
setInterval(async () => {
  if (messageBuffer.length === 0) return;
  const toInsert = messageBuffer.splice(0, messageBuffer.length);
  try {
    const { data: inserted, error } = await supabaseWrapper.bulkInsertMessages(toInsert);
    if (!error && inserted && inserted.length > 0) {
      inserted.forEach(row => {
        if (row && row.id) {
          socketIoChatMessages.add(row.id);
          setTimeout(() => socketIoChatMessages.delete(row.id), 2000);
        }
      });
      console.log(`📤 Batch insert: ${toInsert.length} mensagens gravadas no Supabase`);
    }
  } catch (err) {
    console.error('❌ Erro no batch insert, repondo mensagens no buffer:', err.message);
    messageBuffer.push(...toInsert);
  }
}, MESSAGE_FLUSH_INTERVAL_MS);

// =====================================================
// CACHE DE LIVE STREAMS (Reduz carga no Supabase)
// =====================================================
let liveStreamsCache = null;
let liveStreamsCacheTime = 0;
const LIVE_STREAMS_CACHE_TTL = 10000; // 10 segundos (atualiza a cada 10s em vez de centenas de vezes)

async function getActiveLiveStreams() {
  const now = Date.now();

  // Se cache ainda é válido, retornar do cache
  if (liveStreamsCache && (now - liveStreamsCacheTime) < LIVE_STREAMS_CACHE_TTL) {
    console.log('📦 Retornando live_streams do CACHE (reduz carga no Supabase)');
    return liveStreamsCache;
  }

  // Cache expirou, buscar do Supabase
  try {
    console.log('🔄 Buscando live_streams do Supabase (cache expirado)');
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar live_streams:', error);
      // Se houver erro mas temos cache antigo, retornar cache antigo
      if (liveStreamsCache) {
        console.warn('⚠️ Usando cache antigo devido a erro no Supabase');
        return liveStreamsCache;
      }
      throw error;
    }

    // Atualizar cache
    liveStreamsCache = data;
    liveStreamsCacheTime = now;
    console.log(`✅ Cache de live_streams atualizado: ${data?.length || 0} streams ativas`);

    return data;
  } catch (error) {
    console.error('❌ Erro crítico ao buscar live_streams:', error);
    // Retornar cache antigo se existir, ou array vazio
    return liveStreamsCache || [];
  }
}

// Logs detalhados de conexão Socket.IO
io.engine.on('connection_error', (err) => {
  const origin = err.req?.headers?.origin || 'unknown origin';
  const userAgent = err.req?.headers?.['user-agent'] || 'unknown';
  const host = err.req?.headers?.host || 'unknown';
  const upgrade = err.req?.headers?.upgrade || 'none';
  const connection = err.req?.headers?.connection || 'none';

  console.error('❌ Socket.IO: Erro de conexão:', origin);
  console.error('❌ Mensagem:', err.message);
  console.error('❌ Detalhes completos:', {
    code: err.code,
    context: err.context,
    type: err.type,
    req: {
      method: err.req?.method,
      url: err.req?.url,
      headers: {
        origin,
        host,
        upgrade,
        connection,
        'user-agent': userAgent
      }
    }
  });
});

io.on('connection', (socket) => {
  const clientInfo = {
    id: socket.id,
    transport: socket.conn.transport.name,
    remoteAddress: socket.handshake.address,
    origin: socket.handshake.headers.origin || 'unknown',
    userAgent: socket.handshake.headers['user-agent'] || 'unknown'
  };

  console.log(`✅ Viewer conectado:`, clientInfo);

  // Log de upgrade de transporte (polling -> websocket)
  socket.conn.on('upgrade', () => {
    console.log(`🔄 Socket ${socket.id} fez upgrade para: ${socket.conn.transport.name}`);
  });

  // Log de erro no socket
  socket.on('error', (error) => {
    console.error(`❌ Erro no socket ${socket.id}:`, error);
  });

  const broadcastViewerCount = (streamId) => {
    const room = io.sockets.adapter.rooms.get(`stream:${streamId}`);
    const viewerCount = room ? room.size : 0;

    supabaseWrapper.updateViewerCount(streamId, viewerCount);

    io.to(`stream:${streamId}`).emit('viewer-count-updated', {
      streamId,
      count: viewerCount,
      timestamp: Date.now()
    });

    if (lastViewerCountByStream.get(streamId) !== viewerCount) {
      lastViewerCountByStream.set(streamId, viewerCount);
      console.log(`📊 Viewer count atualizado para stream ${streamId}: ${viewerCount}`);
    }
  };

  // Viewer se junta à sala da stream (ack para load-test e clientes que esperam confirmação)
  socket.on('join-stream', async (data, ack) => {
    const { streamId } = data;

    if (!streamId) {
      socket.emit('error', { message: 'streamId é obrigatório' });
      if (typeof ack === 'function') ack(new Error('streamId é obrigatório'));
      return;
    }

    try {
      const alreadyInRoom = streamRooms.get(streamId)?.has(socket.id);

      socket.join(`stream:${streamId}`);

      if (!streamRooms.has(streamId)) {
        streamRooms.set(streamId, new Set());
      }
      streamRooms.get(streamId).add(socket.id);
      cache.addViewer(streamId, socket.id);

      if (!alreadyInRoom) {
        console.log(`👥 Viewer ${socket.id} entrou na stream ${streamId}`);
        socket.to(`stream:${streamId}`).emit('viewer-joined', { streamId });
      }

      socket.emit('joined-stream', { streamId });
      broadcastViewerCount(streamId);
      if (typeof ack === 'function') ack(null);
    } catch (error) {
      console.error(`❌ [Socket] Erro ao entrar na stream ${streamId}:`, error);
      socket.emit('error', { message: 'Erro ao entrar na stream' });
      if (typeof ack === 'function') ack(error);
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

      // ✅ RESILIENTE: Remover do cache
      cache.removeViewer(streamId, socket.id);

      console.log(`👋 Viewer ${socket.id} saiu da stream ${streamId}`);

      // ✅ NOVO: Broadcast atualizado da contagem de viewers para TODOS
      broadcastViewerCount(streamId);
    }
  });

  // ✅ Admin lança promoção VIP para todos os viewers
  socket.on('vip-promo-launched', (data) => {
    const { streamId } = data || {};
    if (!streamId) return;
    console.log(`💎 Admin lançou promoção VIP na stream ${streamId}`);
    // Retransmite para TODOS (Global)
    io.emit('vip-promo-launched', { streamId });
  });

  // ✅ Admin anuncia novo VIP com nome (overlay animado para todos)
  socket.on('vip-new-subscriber', (data) => {
    const { streamId, name } = data || {};
    if (!streamId || !name) return;
    console.log(`🎉 Novo VIP anunciado na stream ${streamId}: ${name}`);
    // Retransmite para TODOS (incluindo o admin) - Global
    io.emit('vip-new-subscriber', { streamId, name });
  });

  // ✅ Admin lança alerta VIP manual (overlay animado para todos)
  socket.on('vip-alert-received', (data) => {
    const { streamId, name } = data || {};
    if (!streamId || !name) return;
    console.log(`💎 Alerta VIP manual retransmitido na stream ${streamId}: ${name}`);
    // Retransmite para TODOS - Global
    io.emit('vip-alert-received', { streamId, name });
  });

  // Chat: Viewer envia mensagem (Write-Behind + Read-Through Cache)
  socket.on('chat-message', async (data) => {
    const { streamId, userId, message, messageType, userName, tts_text, audio_duration, vip_color } = data;

    if (!streamId || !message) {
      socket.emit('error', { message: 'streamId e message são obrigatórios' });
      return;
    }

    if (!userId) {
      socket.emit('error', { message: 'Você precisa fazer login para enviar mensagens. Faça login ou cadastre-se.' });
      console.log(`❌ [Chat] Tentativa de msg sem login na stream ${streamId}`);
      return;
    }

    console.log(`💬 [Chat] Recebida msg de ${userId} para stream ${streamId}: "${message.substring(0, 30)}..." (Cor: ${vip_color || 'default'})`);

    try {
      // ✅ Read-Through Cache: obter usuário do cache; só consulta Supabase se não estiver no cache
      let finalUserName = userName || 'Anônimo';
      let userIsVip = false;
      let userIsAdmin = false;

      const { data: userData, fromCache } = await supabaseWrapper.getUser(userId);
      if (userData) {
        finalUserName = userData.name || userName || 'Anônimo';
        userIsVip = !!userData.is_vip;
        userIsAdmin = !!userData.is_admin;
        if (!fromCache) {
          console.log(`✅ Backend: Dados do usuário (DB): ${finalUserName} (VIP: ${userIsVip}, Admin: ${userIsAdmin})`);
        }
      }

      const messageData = {
        stream_id: streamId,
        user_id: userData ? userId : null,
        message: message,
        message_type: messageType || 'text',
        user_name: finalUserName,
        vip_color: vip_color || null
      };
      if (messageType === 'tts') {
        messageData.tts_text = tts_text || message;
        messageData.audio_duration = audio_duration || null;
      }

      // 1. Broadcast imediato (latência zero para o utilizador)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const enrichedMessage = {
        id: tempId,
        stream_id: streamId,
        user_id: userId,
        message: messageData.message,
        message_type: messageData.message_type,
        user_name: finalUserName,
        created_at: new Date().toISOString(),
        is_vip: userIsVip,
        is_admin: userIsAdmin,
        vip_color: messageData.vip_color
      };
      if (messageData.tts_text) enrichedMessage.tts_text = messageData.tts_text;
      if (messageData.audio_duration != null) enrichedMessage.audio_duration = messageData.audio_duration;

      io.to(`stream:${streamId}`).emit('new-message', enrichedMessage);
      console.log(`📡 [Chat] Broadcast de nova mensagem ID ${tempId} para sala stream:${streamId}`);

      // 2. Adicionar ao buffer para batch insert (flush a cada 3–5 s)
      messageBuffer.push(messageData);

      console.log(`💬 [Chat] Mensagem na stream ${streamId} por ${finalUserName} (VIP: ${userIsVip}) [buffer: ${messageBuffer.length}]`);
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
    const { streamId, userId, message, messageType, userName, isVip, vipColor, vip_color } = data;

    const finalColor = vip_color || vipColor || null;

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
          user_name: userName,
          vip_color: finalColor
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar mensagem VIP:', error);
        // Não bloquear, apenas logar
      }

      // Broadcast para TODOS os viewers (VIP messages aparecem para todos)
      // Garantir que a cor está no broadcast mesmo que não tenha salvo no Supabase
      const broadcastData = savedMessage || {
        ...data,
        id: `vip-${Date.now()}`,
        created_at: new Date().toISOString(),
        vip_color: finalColor
      };

      io.to(`stream:${streamId}`).emit('new-vip-message', broadcastData);

      console.log(`👑 Mensagem VIP enviada na stream ${streamId} por ${userName} (Cor: ${finalColor})`);
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
    const { streamId, question, options, userId, durationSeconds } = data;

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

      // Calcular starts_at e ends_at se durationSeconds for fornecido
      const now = new Date();
      const startsAt = now.toISOString();
      const endsAt = durationSeconds ? new Date(now.getTime() + durationSeconds * 1000).toISOString() : null;

      // Criar nova enquete ativa e fixada
      const { data: newPoll, error } = await supabase
        .from('stream_polls')
        .insert({
          stream_id: streamId,
          created_by: userId || null,
          question: question.trim(),
          options: options.map((opt, idx) => ({ id: idx + 1, text: opt.text.trim() })),
          is_active: true,
          is_pinned: true,
          duration_seconds: durationSeconds || null,
          starts_at: startsAt,
          ends_at: endsAt
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
      // Emitir alias poll:start para compatibilidade
      io.to(`stream:${streamId}`).emit('poll:start', {
        poll: newPoll,
        streamId
      });

      socket.emit('poll-created', { poll: newPoll });
      console.log(`📊 Enquete criada na stream ${streamId}: ${newPoll.id}`);

      // Se duration_seconds foi fornecido, agendar auto-end
      if (durationSeconds && durationSeconds > 0) {
        setTimeout(async () => {
          try {
            // Verificar se a enquete ainda está ativa
            const { data: currentPoll } = await supabase
              .from('stream_polls')
              .select('*')
              .eq('id', newPoll.id)
              .single();

            if (currentPoll && currentPoll.is_active) {
              // Desativar enquete automaticamente
              const { error: updateError } = await supabase
                .from('stream_polls')
                .update({ is_active: false, is_pinned: false })
                .eq('id', newPoll.id);

              if (!updateError) {
                // Broadcast poll:end e poll-updated
                io.to(`stream:${streamId}`).emit('poll:end', {
                  pollId: newPoll.id,
                  streamId
                });
                io.to(`stream:${streamId}`).emit('poll-updated', {
                  eventType: 'UPDATE',
                  poll: { ...currentPoll, is_active: false, is_pinned: false },
                  oldPoll: currentPoll
                });
                console.log(`⏰ Enquete ${newPoll.id} encerrada automaticamente após ${durationSeconds}s`);
              }
            }
          } catch (err) {
            console.error('❌ Erro ao encerrar enquete automaticamente:', err);
          }
        }, durationSeconds * 1000);
      }
    } catch (error) {
      console.error('❌ Erro ao processar criação de enquete:', error);
      socket.emit('error', { message: 'Erro ao criar enquete' });
    }
  });

  // Alias: poll:start (compatibilidade)
  socket.on('poll:start', (data) => {
    // Redirecionar para poll-create
    socket.emit('poll-create', data);
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

      // Se for marcar como deletada (soft delete), desativar e desfixar também
      if (updates.is_deleted === true) {
        updates.is_active = false;
        updates.is_pinned = false;
        console.log(`🗑️ Backend: Marcando enquete ${pollId} como deletada`);
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
          // Emitir alias poll:update para compatibilidade
          io.to(`stream:${finalStreamId}`).emit('poll:update', {
            eventType: 'UPDATE',
            poll: freshPoll,
            oldPoll: currentPoll,
            streamId: finalStreamId
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

      console.log(`🗑️ Backend deletando (LOGICAMENTE) enquete ${pollId} da stream ${finalStreamId}`);

      // Deletar enquete LOGICAMENTE para preservar votos
      const { error } = await supabase
        .from('stream_polls')
        .update({
          is_deleted: true,
          is_active: false,
          is_pinned: false
        })
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
      // Emitir alias poll:end para compatibilidade
      io.to(`stream:${finalStreamId}`).emit('poll:end', {
        pollId,
        streamId: finalStreamId
      });
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
        .eq('is_deleted', false)
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
        // Emitir alias poll:vote para compatibilidade
        io.to(`stream:${pollData.stream_id}`).emit('poll:vote', {
          pollId,
          optionId,
          results: voteResult.results || [],
          totalVotes: voteResult.total_votes || 0,
          streamId: pollData.stream_id
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
  socket.on('disconnect', (reason) => {
    console.log(`❌ Viewer desconectado: ${socket.id}, motivo: ${reason}`);

    // Remover de todas as salas e broadcast viewer count
    for (const [streamId, sockets] of streamRooms.entries()) {
      const wasInRoom = sockets.has(socket.id);
      sockets.delete(socket.id);

      if (sockets.size === 0) {
        streamRooms.delete(streamId);
      }

      // ✅ RESILIENTE: Remover do cache
      if (wasInRoom) {
        cache.removeViewer(streamId, socket.id);
      }

      // ✅ NOVO: Se o viewer estava nesta sala, broadcast contagem atualizada
      if (wasInRoom) {
        broadcastViewerCount(streamId);
      }
    }
  });
});

// =====================================================
// LISTEN PARA MUDANÇAS NO SUPABASE (Realtime → Socket.io)
// =====================================================

// Escutar mudanças no Supabase Realtime e broadcast via Socket.io
// Isso permite que o backend escute mudanças e notifique os clientes

// ✅ CANAL PARA ESCUTAR ATUALIZAÇÕES DE MENSAGENS (pins, etc.)
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

    // ⚠️ IMPORTANTE: Verificar se esta mensagem veio do Socket.io
    // Se sim, não fazer broadcast duplicado (o Socket.io já fez)
    if (eventType === 'INSERT' && data.id && socketIoChatMessages.has(data.id)) {
      console.log(`⏭️ Ignorando broadcast duplicado do Realtime para mensagem ${data.id} (já foi broadcastado via Socket.io)`);
      // Ainda processar pinned-link se necessário
      if (data.is_pinned) {
        io.to(`stream:${data.stream_id}`).emit('pinned-link-updated', data);
      }
      return;
    }

    // Se a mensagem for ou era fixada, notificar mudança de pinned-link
    if (data.is_pinned || (payload.old && payload.old.is_pinned)) {
      console.log(`📌 Mudança em mensagem FIXADA via Realtime: ${data.id}`);
      io.to(`stream:${data.stream_id}`).emit('pinned-link-updated', data.is_pinned ? data : null);
    }

    // Broadcast para todos os viewers da stream (mensagens normais)
    if (eventType === 'INSERT') {
      // Broadcast apenas se for uma mensagem externa (não via Socket.io)
      // O handler Socket.io já faz broadcast, então este é apenas backup para webhooks/bots
      io.to(`stream:${data.stream_id}`).emit('new-message', data);
    } else if (eventType === 'UPDATE') {
      // Nota: Curtidas foram desativadas, então UPDATE aqui geralmente seria para fixação ou edição
      io.to(`stream:${data.stream_id}`).emit('message-updated', data);
    } else if (eventType === 'DELETE') {
      io.to(`stream:${data.stream_id}`).emit('message-deleted', {
        messageId: data.id,
        streamId: data.stream_id
      });
    }
  })
  .subscribe();

console.log('✅ Canal Realtime configurado para atualizações de mensagens (pins, etc.)');

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

// Canal para escutar mudanças em live_streams (inicio/fim de transmissao)
const liveStreamsChannel = supabase
  .channel('socket-live-streams-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'live_streams'
  }, async (payload) => {
    const stream = payload.new || payload.old;
    const streamId = stream?.id;

    console.log('📺 Mudança detectada em live_streams:', payload.eventType, streamId);

    if (!streamId) return;

    // ✅ INVALIDAR CACHE quando houver mudança em live_streams
    console.log('🔄 Invalidando cache de live_streams devido a mudança');
    liveStreamsCache = null;
    liveStreamsCacheTime = 0;

    // Buscar dados atualizados imediatamente
    const updatedStreams = await getActiveLiveStreams();

    // Broadcast para TODOS os clientes conectados (não apenas da stream específica)
    io.emit('live-streams-updated', {
      streams: updatedStreams,
      timestamp: Date.now()
    });

    // Broadcast para todos os viewers da stream específica
    io.to(`stream:${streamId}`).emit('stream-updated', {
      streamId: streamId,
      updates: payload.new || {},
      eventType: payload.eventType
    });

    // Se a live foi encerrada (is_active mudou de true para false)
    if (payload.eventType === 'UPDATE' &&
      payload.old?.is_active === true &&
      payload.new?.is_active === false) {
      console.log('🛑 Live encerrada! Notificando todos os viewers da stream:', streamId);

      // Emitir evento especifico de encerramento
      io.to(`stream:${streamId}`).emit('stream-ended', {
        streamId: streamId,
        message: 'A transmissão foi encerrada pelo administrador'
      });
    }
  })
  .subscribe();

console.log('✅ Canal Realtime configurado para live_streams');

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
  console.log(`🔧 Ambiente: ${NODE_ENV}`);
  console.log(`✅ Pronto para receber conexões WebSocket`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);

  if (isProduction) {
    console.log('⚠️  PRODUÇÃO: Certifique-se de que o Nginx está configurado para proxy WebSocket');
    console.log('⚠️  PRODUÇÃO: Verifique se o certificado SSL está válido');
  }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});
