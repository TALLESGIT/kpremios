#!/bin/bash
# Script para debugar WebSocket em tempo real

echo "=========================================="
echo "DEBUG WEBSOCKET - TEMPO REAL"
echo "=========================================="
echo ""
echo "Este script vai monitorar logs enquanto você testa no navegador"
echo "Pressione Ctrl+C para parar"
echo ""
echo "Iniciando monitoramento..."
echo ""

# Função para limpar ao sair
cleanup() {
    echo ""
    echo "Monitoramento encerrado."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Monitorar logs do Nginx
echo "📊 Logs do Nginx (acesso):"
echo "----------------------------------------"
tail -f /var/log/nginx/api.zkoficial.com.br-access.log &
NGINX_ACCESS_PID=$!

# Monitorar logs de erro do Nginx
echo ""
echo "📊 Logs do Nginx (erro):"
echo "----------------------------------------"
tail -f /var/log/nginx/api.zkoficial.com.br-error.log &
NGINX_ERROR_PID=$!

# Monitorar logs do backend
echo ""
echo "📊 Logs do Backend (PM2):"
echo "----------------------------------------"
pm2 logs zkpremios-socket --lines 0 &
PM2_PID=$!

# Aguardar
wait
