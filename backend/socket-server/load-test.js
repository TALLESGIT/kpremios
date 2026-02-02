// =====================================================
// LOAD TEST - Simula N viewers: entrar, sair, reentrar, mensagens
// Uso: node load-test.js [numClientes] [streamId] [url] [pathUsersJson]
// Local:  node load-test.js 850 ... http://localhost:3001
// VPS:    node load-test.js 850 ... https://api.zkoficial.com.br  (ver logs: ssh root@VPS pm2 logs zkpremios-socket)
// Com usuários reais: node load-test.js 850 ... https://api.zkoficial.com.br load-test-users.json
// =====================================================

const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client');

// Fallback: UUID único quando não há ficheiro de usuários
const LOAD_TEST_USER_ID = 'a0000000-0000-0000-0000-000000000001';

const numClients = parseInt(process.argv[2] || '850', 10);
const streamId = process.argv[3] || 'b816b205-65e0-418e-8205-c3d56edd76c7';
const serverUrl = process.argv[4] || process.env.SOCKET_SERVER_URL || 'https://api.zkoficial.com.br';
const usersJsonPath = process.argv[5] || path.join(__dirname, 'load-test-users.json');

let testUsers = [];
if (fs.existsSync(usersJsonPath)) {
  try {
    testUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    console.log('Utilizando', testUsers.length, 'usuários de teste de', usersJsonPath);
  } catch (e) {
    console.warn('Aviso: não foi possível carregar', usersJsonPath, '- usando userId fixo.');
  }
}

const DURATION_MS = 3 * 60 * 1000; // 3 minutos para 850 clientes
const MESSAGE_RATE = 0.05; // 5% enviam mensagem
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 150;

console.log('==========================================');
console.log('LOAD TEST - Socket.io Live (entrar / sair / mensagens)');
console.log('==========================================');
console.log('Clientes:', numClients);
console.log('Stream ID:', streamId);
console.log('URL:', serverUrl);
console.log('Duração:', DURATION_MS / 1000, 'segundos');
console.log('==========================================\n');

const sockets = [];
let connected = 0;
let joined = 0;
let errors = 0;
let messagesSent = 0;
let leavesSent = 0;
let reJoinsSent = 0;

function createClient(index) {
  const socket = io(serverUrl, {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 3,
    timeout: 15000
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
  socket.on('error', () => { errors++; });
  socket.on('connect_error', () => { errors++; });

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
  await new Promise((r) => setTimeout(r, 8000));

  const numSenders = Math.max(1, Math.floor(numClients * MESSAGE_RATE));
  for (let i = 0; i < numSenders; i++) {
    const u = testUsers.length ? testUsers[i % testUsers.length] : null;
    const userId = u ? u.id : LOAD_TEST_USER_ID;
    const userName = u ? u.name : 'Viewer' + i;
    setTimeout(() => {
      const s = sockets[i];
      if (s && s.connected && s._inRoom) {
        s.emit('chat-message', {
          streamId,
          userId,
          message: 'Teste carga #' + (i + 1) + ' - ' + new Date().toISOString(),
          messageType: 'text',
          userName
        });
        messagesSent++;
        if (messagesSent % 20 === 0) {
          console.log('[Mensagens] Enviadas: ' + messagesSent);
        }
      }
    }, 10000 + i * 200);
  }

  // Ciclos de sair / reentrar
  const leave1 = Math.floor(numClients * 0.20);
  const leave2 = Math.floor(numClients * 0.15);
  const leave3 = Math.floor(numClients * 0.25);

  setTimeout(() => {
    console.log('[Ciclo 1] ' + leave1 + ' clientes saindo da live...');
    for (let i = 0; i < leave1; i++) {
      doLeave(sockets[i]);
    }
  }, 20000);

  setTimeout(() => {
    console.log('[Ciclo 1] Reentrando na live...');
    for (let i = 0; i < leave1; i++) {
      doJoin(sockets[i]);
    }
  }, 35000);

  setTimeout(() => {
    console.log('[Ciclo 2] ' + leave2 + ' clientes saindo...');
    for (let i = numClients - leave2; i < numClients; i++) {
      doLeave(sockets[i]);
    }
  }, 55000);

  setTimeout(() => {
    console.log('[Ciclo 2] Reentrando...');
    for (let i = numClients - leave2; i < numClients; i++) {
      doJoin(sockets[i]);
    }
  }, 70000);

  setTimeout(() => {
    console.log('[Ciclo 3] ' + leave3 + ' clientes saindo...');
    for (let i = Math.floor(numClients / 2) - Math.floor(leave3 / 2); i < Math.floor(numClients / 2) + Math.ceil(leave3 / 2); i++) {
      if (sockets[i]) doLeave(sockets[i]);
    }
  }, 95000);

  setTimeout(() => {
    console.log('[Ciclo 3] Reentrando...');
    for (let i = Math.floor(numClients / 2) - Math.floor(leave3 / 2); i < Math.floor(numClients / 2) + Math.ceil(leave3 / 2); i++) {
      if (sockets[i]) doJoin(sockets[i]);
    }
  }, 110000);

  await new Promise((r) => setTimeout(r, DURATION_MS - 15000));

  console.log('\n--- Encerrando... ---');
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
  console.log('Mensagens enviadas:', messagesSent);
  console.log('Erros:', errors);
  console.log('==========================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
