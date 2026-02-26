// =====================================================
// PM2 ECOSYSTEM CONFIG
// =====================================================
// Configuração para rodar o backend Socket.IO em produção
//
// Uso:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup

module.exports = {
  apps: [{
    name: 'zkpremios-socket',
    script: './server.js',
    cwd: '/var/www/zkpremios-backend',
    instances: 1,
    exec_mode: 'fork',

    // Variáveis de ambiente (produção)
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Variáveis de ambiente (desenvolvimento - se necessário)
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },

    // Configurações do PM2
    autorestart: true,
    watch: false,
    max_memory_restart: '250M',

    // Logs
    error_file: '/root/.pm2/logs/zkpremios-socket-error.log',
    out_file: '/root/.pm2/logs/zkpremios-socket-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Configurações avançadas
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 10000
  }]
};
