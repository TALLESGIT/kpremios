// =====================================================
// LOAD TEST - Simula N viewers + mensagens normais + mensagens VIP (stress até cair ou aguentar)
// Uso: node load-test.js [numClientes] [streamId] [url] [pathUsersJson]
// Ex.: node load-test.js 1500 ... https://api.zkoficial.com.br load-test-users.json
// =====================================================

const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client');

// Fallback: UUID único quando não há ficheiro de usuários
const LOAD_TEST_USER_ID = 'a0000000-0000-0000-0000-000000000001';

const numClients = parseInt(process.argv[2] || '1500', 10);
const streamId = process.argv[3] || 'b816b205-65e0-418e-8205-c3d56edd76c7';
const serverUrl = process.argv[4] || process.env.SOCKET_SERVER_URL || 'https://api.zkoficial.com.br';
const usersJsonPath = process.argv[5] || path.join(__dirname, 'load-test-users.json');

let testUsers = [];
if (fs.existsSync(usersJsonPath)) {
  try {
    testUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    const vips = testUsers.filter((u) => u.is_vip).length;
    console.log('Utilizando', testUsers.length, 'usuários de teste de', usersJsonPath, vips ? `(${vips} VIPs)` : '');
  } catch (e) {
    console.warn('Aviso: não foi possível carregar', usersJsonPath, '- usando userId fixo.');
  }
}

const DURATION_MS = 5 * 60 * 1000; // 5 minutos para stress com 1500
const MESSAGE_RATE = 0.12; // 12% enviam mensagem (~180 senders para 1500) — mais ativo
const VIP_SENDER_RATE = 0.25; // 25% dos senders enviam mensagem VIP (se houver VIPs)
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 220; // maior intervalo entre lotes para reduzir picos e desconexões

console.log('==========================================');
console.log('LOAD TEST - Socket.io Live (entrar / sair / mensagens)');
console.log('==========================================');
console.log('Clientes:', numClients);
console.log('Stream ID:', streamId);
console.log('URL:', serverUrl);
console.log('Duração:', DURATION_MS / 1000, 'segundos');
console.log('==========================================\n');

const sockets = [];
const recentMessageIds = []; // últimas mensagens (id real do backend; temp-/cache- não usados para like)
const MAX_MESSAGE_IDS = 150;
let connected = 0;
let joined = 0;
let errors = 0;
let errorsConnect = 0;
let errorsJoin = 0;
let errorsOther = 0;
let messagesSent = 0;
let vipMessagesSent = 0;
let likesSent = 0;
let leavesSent = 0;
let reJoinsSent = 0;

function createClient(index) {
  const socket = io(serverUrl, {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 6,
    timeout: 22000
  });

  socket._clientIndex = index;
  socket._inRoom = false;

  socket.on('connect', () => {
    connected++;
    if (connected % 100 === 0 || connected === numClients) {
      console.log('[' + new Date().toISOString() + '] Conectados: ' + connected + '/' + numClients);
    }
    socket.emit('join-stream', { streamId }, (err) => {
      if (err) {
        errors++;
        errorsJoin++;
        return;
      }
      joined++;
      socket._inRoom = true;
      if (joined % 100 === 0 || joined === numClients) {
        console.log('[' + new Date().toISOString() + '] Na sala: ' + joined + '/' + numClients);
      }
    });
  });

  socket.on('joined-stream', () => {});
  socket.on('viewer-count-updated', () => {});
  socket.on('new-message', (msg) => {
    if (msg && msg.id) {
      recentMessageIds.push(msg.id);
      if (recentMessageIds.length > MAX_MESSAGE_IDS) recentMessageIds.shift();
    }
  });
  socket.on('error', () => { errors++; errorsOther++; });
  socket.on('connect_error', () => { errors++; errorsConnect++; });

  sockets.push(socket);
  return socket;
}

function doLeave(socket) {
  if (!socket.connected || !socket._inRoom) return;
  socket.emit('leave-stream', { streamId });
  socket._inRoom = false;
  leavesSent++;
}

function doJoin(socket) {
  if (!socket.connected || socket._inRoom) return;
  socket.emit('join-stream', { streamId }, (err) => {
    if (!err) {
      socket._inRoom = true;
      reJoinsSent++;
    }
  });
}

async function run() {
  const start = Date.now();

  for (let i = 0; i < numClients; i += BATCH_SIZE) {
    const batch = Math.min(BATCH_SIZE, numClients - i);
    for (let j = 0; j < batch; j++) {
      createClient(i + j);
    }
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log('\n--- Clientes criados. Aguardando conexões... ---\n');
  await new Promise((r) => setTimeout(r, 18000)); // mais tempo para todas as conexões estabilizarem

  const numSenders = Math.max(1, Math.floor(numClients * MESSAGE_RATE));
  const numVipSenders = testUsers.filter((u) => u.is_vip).length > 0
    ? Math.max(1, Math.floor(numSenders * VIP_SENDER_RATE))
    : 0;
  for (let i = 0; i < numSenders; i++) {
    const u = testUsers.length ? testUsers[i % testUsers.length] : null;
    const userId = u ? u.id : LOAD_TEST_USER_ID;
    const userName = u ? u.name : 'Viewer' + i;
    const isVipSender = i < numVipSenders && u && u.is_vip;
    setTimeout(() => {
      const s = sockets[i];
      if (!s || !s.connected || !s._inRoom) return;
      if (isVipSender) {
        s.emit('vip-message', {
          streamId,
          userId,
          message: '[VIP] Stress #' + (i + 1) + ' - ' + new Date().toISOString(),
          messageType: 'text',
          userName,
          isVip: true
        });
        vipMessagesSent++;
        if (vipMessagesSent % 5 === 0) console.log('[VIP] Enviadas: ' + vipMessagesSent);
      } else {
        s.emit('chat-message', {
          streamId,
          userId,
          message: 'Teste carga #' + (i + 1) + ' - ' + new Date().toISOString(),
          messageType: 'text',
          userName
        });
        messagesSent++;
        if (messagesSent % 20 === 0) console.log('[Chat] Enviadas: ' + messagesSent);
      }
    }, 10000 + i * 180);
  }

  // Curtidas: a partir de 20s, a cada 3s vários clientes curtem apenas mensagens com ID real (UUID)
  let likeIntervalId;
  setTimeout(() => {
    likeIntervalId = setInterval(() => {
      if (recentMessageIds.length === 0) return;
      const numLikers = Math.min(25, Math.floor(sockets.length * 0.012));
      for (let k = 0; k < numLikers; k++) {
        const s = sockets[Math.floor(Math.random() * sockets.length)];
        if (!s || !s.connected || !s._inRoom) continue;
        const msgId = recentMessageIds[Math.floor(Math.random() * recentMessageIds.length)];
        const u = testUsers.length ? testUsers[Math.floor(Math.random() * testUsers.length)] : null;
        s.emit('like-message', {
          streamId,
          messageId: msgId,
          userId: u ? u.id : LOAD_TEST_USER_ID,
          sessionId: u ? undefined : 'loadtest-' + s._clientIndex
        });
        likesSent++;
        if (likesSent % 20 === 0) console.log('[Like] Curtidas enviadas: ' + likesSent);
      }
    }, 3000);
  }, 20000);

  // Viewers ficam na sala até o fim do teste (ou até o admin encerrar a live) — sem ciclos de sair/reentrar
  await new Promise((r) => setTimeout(r, DURATION_MS - 15000));

  console.log('\n--- Encerrando... ---');
  if (likeIntervalId) clearInterval(likeIntervalId);
  sockets.forEach((s) => s.disconnect());
  await new Promise((r) => setTimeout(r, 3000));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('RESULTADO');
  console.log('==========================================');
  console.log('Tempo total:', elapsed, 's');
  console.log('Conectados (pico):', connected);
  console.log('Entraram na sala:', joined);
  console.log('Saídas (leave-stream):', leavesSent);
  console.log('Reentradas (join-stream):', reJoinsSent);
  console.log('Mensagens chat enviadas:', messagesSent);
  console.log('Mensagens VIP enviadas:', vipMessagesSent);
  console.log('Curtidas enviadas:', likesSent);
  console.log('Erros (total):', errors);
  if (errors > 0) {
    console.log('  - connect_error:', errorsConnect);
    console.log('  - join-stream:', errorsJoin);
    console.log('  - error (outros):', errorsOther);
  }
  console.log('==========================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
