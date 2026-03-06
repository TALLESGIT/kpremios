#!/bin/bash
# Teste completo de WebSocket via Nginx

echo "=========================================="
echo "TESTE COMPLETO WEBSOCKET VIA NGINX"
echo "=========================================="
echo ""

echo "1. Testando health check direto (localhost):"
echo "----------------------------------------"
curl -s http://localhost:3001/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/health
echo ""

echo "2. Testando health check via Nginx (HTTPS):"
echo "----------------------------------------"
curl -s https://api.zkoficial.com.br/health | jq '.' 2>/dev/null || curl -s https://api.zkoficial.com.br/health
echo ""

echo "3. Testando upgrade WebSocket via Nginx:"
echo "----------------------------------------"
curl -v -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket 2>&1 | head -30
echo ""

echo "4. Verificando configuração do Nginx (location /socket.io/):"
echo "----------------------------------------"
grep -A 15 "location /socket.io/" /etc/nginx/sites-available/api.zkoficial.com.br
echo ""

echo "5. Verificando map no nginx.conf:"
echo "----------------------------------------"
nginx -T 2>/dev/null | grep -A 3 "map.*upgrade" || echo "Map não encontrado no nginx.conf!"
echo ""

echo "6. Últimas requisições ao /socket.io/ no Nginx:"
echo "----------------------------------------"
tail -10 /var/log/nginx/api.zkoficial.com.br-access.log | grep socket.io || echo "Nenhuma requisição encontrada"
echo ""

echo "7. Últimos erros do Nginx:"
echo "----------------------------------------"
tail -10 /var/log/nginx/api.zkoficial.com.br-error.log || echo "Nenhum erro encontrado"
echo ""

echo "8. Status do backend:"
echo "----------------------------------------"
pm2 list | grep zkpremios-socket
echo ""

echo "9. Últimos logs do backend:"
echo "----------------------------------------"
pm2 logs zkpremios-socket --lines 5 --nostream | tail -5
echo ""

echo "=========================================="
echo "TESTE CONCLUÍDO"
echo "=========================================="
