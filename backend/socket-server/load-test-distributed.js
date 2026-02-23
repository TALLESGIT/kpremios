// =====================================================
// LOAD TEST DISTRIBUÍDO - Vários processos, total de clientes dividido entre eles
// Uso: node load-test-distributed.js [totalClientes] [streamId] [url] [pathUsersJson] [numWorkers]
// Ex.: node load-test-distributed.js 1500 b816b205-65e0-418e-8205-c3d56edd76c7 https://api.zkoficial.com.br load-test-users.json 3
//      → 3 processos, cada um com 500 clientes = 1500 total
// =====================================================

const path = require('path');
const { spawn } = require('child_process');

const totalClients = parseInt(process.argv[2] || '1500', 10);
const streamId = process.argv[3] || 'b816b205-65e0-418e-8205-c3d56edd76c7';
const serverUrl = process.argv[4] || process.env.SOCKET_SERVER_URL || 'https://api.zkoficial.com.br';
const usersJsonPath = process.argv[5] || path.join(__dirname, 'load-test-users.json');
const numWorkers = parseInt(process.argv[6] || '3', 10);

const clientsPerWorker = Math.floor(totalClients / numWorkers);
if (clientsPerWorker < 1) {
  console.error('Erro: totalClientes deve ser >= numWorkers. Use menos workers ou mais clientes.');
  process.exit(1);
}

console.log('==========================================');
console.log('LOAD TEST DISTRIBUÍDO');
console.log('==========================================');
console.log('Total de clientes:', totalClients);
console.log('Workers (processos):', numWorkers);
console.log('Clientes por worker:', clientsPerWorker);
console.log('Stream ID:', streamId);
console.log('URL:', serverUrl);
console.log('==========================================\n');

const loadTestPath = path.join(__dirname, 'load-test.js');
const workers = [];
const start = Date.now();

for (let w = 0; w < numWorkers; w++) {
  const child = spawn(
    process.execPath,
    [loadTestPath, String(clientsPerWorker), streamId, serverUrl, usersJsonPath],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, LOAD_TEST_WORKER: String(w + 1) }
    }
  );

  let prefix = `[Worker ${w + 1}/${numWorkers}] `;
  child.stdout.on('data', (data) => {
    process.stdout.write(prefix + data.toString().replace(/\n/g, '\n' + prefix));
  });
  child.stderr.on('data', (data) => {
    process.stderr.write(prefix + data.toString().replace(/\n/g, '\n' + prefix));
  });

  workers.push(
    new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code !== 0) reject(new Error(`Worker ${w + 1} saiu com código ${code}`));
        else resolve();
      });
      child.on('error', reject);
    })
  );
}

Promise.all(workers)
  .then(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n==========================================');
    console.log('DISTRIBUÍDO: todos os', numWorkers, 'workers terminaram em', elapsed, 's');
    console.log('Some os "Conectados" e "Entraram na sala" de cada RESULTADO acima para o total.');
    console.log('==========================================\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
