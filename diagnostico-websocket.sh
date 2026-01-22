#!/bin/bash
# Script de diagnóstico para WebSocket

echo "=========================================="
echo "DIAGNÓSTICO WEBSOCKET"
echo "=========================================="
echo ""

echo "1. Verificando se backend está rodando:"
echo "----------------------------------------"
pm2 list | grep zkpremios-socket
echo ""

echo "2. Testando health check direto (localhost):"
echo "----------------------------------------"
curl -s http://localhost:3001/health | head -5
echo ""

echo "3. Testando health check via Nginx (HTTPS):"
echo "----------------------------------------"
curl -s https://api.zkoficial.com.br/health | head -5
echo ""

echo "4. Verificando logs do Nginx (últimas 20 linhas de erro):"
echo "----------------------------------------"
tail -20 /var/log/nginx/api.zkoficial.com.br-error.log
echo ""

echo "5. Verificando logs do Nginx (últimas 10 linhas de acesso):"
echo "----------------------------------------"
tail -10 /var/log/nginx/api.zkoficial.com.br-access.log | grep socket.io
echo ""

echo "6. Verificando logs do backend (últimas 20 linhas):"
echo "----------------------------------------"
pm2 logs zkpremios-socket --lines 20 --nostream | tail -20
echo ""

echo "7. Verificando configuração do Nginx (socket.io):"
echo "----------------------------------------"
grep -A 10 "location /socket.io" /etc/nginx/sites-available/api.zkoficial.com.br
echo ""

echo "8. Testando conexão WebSocket direta:"
echo "----------------------------------------"
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket 2>&1 | head -20
echo ""

echo "=========================================="
echo "DIAGNÓSTICO CONCLUÍDO"
echo "=========================================="
