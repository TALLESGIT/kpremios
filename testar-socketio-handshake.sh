#!/bin/bash
# Teste do handshake Socket.IO Engine.IO 4.x

echo "=========================================="
echo "TESTE HANDSHAKE SOCKET.IO ENGINE.IO 4.x"
echo "=========================================="
echo ""

echo "1. Handshake inicial via polling (obrigatório):"
echo "----------------------------------------"
curl -v "https://api.zkoficial.com.br/socket.io/?EIO=4&transport=polling" \
  -H "Origin: https://www.zkoficial.com.br" \
  2>&1 | grep -E "HTTP|sid|0{" | head -10
echo ""

echo "2. Depois do handshake, tentar upgrade para websocket:"
echo "----------------------------------------"
echo "⚠️  O upgrade para websocket deve ser feito DEPOIS do handshake polling"
echo "⚠️  O cliente Socket.IO faz isso automaticamente"
echo ""

echo "3. Teste completo (simulando cliente Socket.IO):"
echo "----------------------------------------"
# Primeiro, fazer handshake
SID=$(curl -s "https://api.zkoficial.com.br/socket.io/?EIO=4&transport=polling" \
  -H "Origin: https://www.zkoficial.com.br" | grep -o '"sid":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SID" ]; then
  echo "✅ Handshake OK! SID: $SID"
  echo ""
  echo "Agora tentando upgrade para websocket com SID..."
  curl -v -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Host: api.zkoficial.com.br" \
    -H "Origin: https://www.zkoficial.com.br" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    "https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket&sid=$SID" \
    2>&1 | grep -E "HTTP|101|upgrade" | head -10
else
  echo "❌ Falha no handshake inicial"
fi
