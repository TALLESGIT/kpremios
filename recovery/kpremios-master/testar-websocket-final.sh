#!/bin/bash
# Teste final de WebSocket após correção HTTP/2

echo "=========================================="
echo "TESTE FINAL WEBSOCKET (APÓS CORREÇÃO)"
echo "=========================================="
echo ""

echo "1. Testando upgrade WebSocket (deve retornar 101):"
echo "----------------------------------------"
curl -v -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket 2>&1 | grep -E "HTTP|101|upgrade|Connection|Transport" | head -10
echo ""

echo "2. Verificando se está usando HTTP/1.1 (não HTTP/2):"
echo "----------------------------------------"
curl -v -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: api.zkoficial.com.br" \
  -H "Origin: https://www.zkoficial.com.br" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket 2>&1 | grep -E "using HTTP|HTTP/1|HTTP/2" | head -5
echo ""

echo "3. Últimas requisições no Nginx (deve mostrar 101):"
echo "----------------------------------------"
tail -5 /var/log/nginx/api.zkoficial.com.br-access.log | grep socket.io
echo ""

echo "4. Verificando logs do backend (deve mostrar upgrade: websocket):"
echo "----------------------------------------"
pm2 logs zkpremios-socket --lines 5 --nostream | grep -E "upgrade|connection|Transport" | tail -5
echo ""

echo "=========================================="
echo "RESULTADO ESPERADO:"
echo "- HTTP/1.1 101 Switching Protocols"
echo "- upgrade: websocket"
echo "- connection: upgrade"
echo "- Logs do backend: upgrade: 'websocket'"
echo "=========================================="
