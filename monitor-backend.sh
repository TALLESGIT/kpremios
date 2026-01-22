#!/bin/bash
# =====================================================
# MONITOR E RESTART AUTOMÁTICO DO BACKEND
# =====================================================
# Este script monitora o backend Socket.IO e reinicia automaticamente se:
# - O processo PM2 estiver parado
# - O health check falhar
# - A memória estiver muito alta

# Configurações
HEALTH_URL="http://localhost:3001/health"
MAX_MEMORY_MB=800
PM2_APP_NAME="zkpremios-socket"
LOG_FILE="/var/log/zkpremios-monitor.log"

# Função para logar com timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função para verificar se PM2 está rodando
check_pm2_status() {
    pm2 describe "$PM2_APP_NAME" 2>/dev/null | grep -q "online"
    return $?
}

# Função para verificar health check
check_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 5)
    [ "$response" = "200" ]
    return $?
}

# Função para verificar memória
check_memory() {
    memory=$(pm2 describe "$PM2_APP_NAME" 2>/dev/null | grep -oP 'memory\s+:\s+\K[0-9]+' | head -1)
    if [ -n "$memory" ]; then
        memory_mb=$((memory / 1024 / 1024))
        if [ "$memory_mb" -gt "$MAX_MEMORY_MB" ]; then
            log "⚠️  Memória muito alta: ${memory_mb}MB (máximo: ${MAX_MEMORY_MB}MB)"
            return 1
        fi
    fi
    return 0
}

# Função para reiniciar o backend
restart_backend() {
    log "🔄 Reiniciando backend..."
    pm2 restart "$PM2_APP_NAME"
    sleep 5
    
    if check_pm2_status && check_health; then
        log "✅ Backend reiniciado com sucesso"
        return 0
    else
        log "❌ Falha ao reiniciar backend"
        return 1
    fi
}

# Monitoramento principal
log "🚀 Iniciando monitoramento do backend..."

while true; do
    # Verificar status do PM2
    if ! check_pm2_status; then
        log "❌ PM2 não está rodando!"
        restart_backend
    # Verificar health check
    elif ! check_health; then
        log "❌ Health check falhou!"
        restart_backend
    # Verificar memória
    elif ! check_memory; then
        log "⚠️  Reiniciando por uso alto de memória..."
        restart_backend
    else
        # Tudo OK, apenas logar a cada 5 minutos
        if [ $(($(date +%s) % 300)) -eq 0 ]; then
            log "✅ Backend funcionando normalmente"
        fi
    fi
    
    # Aguardar 30 segundos antes da próxima verificação
    sleep 30
done
