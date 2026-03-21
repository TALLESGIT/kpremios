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
    instances: 'max', // Utilizar todos os 4 núcleos da CPU
    exec_mode: 'cluster', // Modo cluster para balanceamento de carga
    
    // Variáveis de ambiente (produção)
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      REDIS_URL: 'redis://127.0.0.1:6379'
    },
    
    // Variáveis de ambiente (desenvolvimento - se necessário)
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    
    // Configurações do PM2
    autorestart: true,
    watch: false,
    max_memory_restart: '1G', // Aumentado para 1GB (você tem 16GB de RAM)
    
    // Logs
    error_file: '/root/.pm2/logs/zkpremios-socket-error.log',
    out_file: '/root/.pm2/logs/zkpremios-socket-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Configurações avançadas
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
