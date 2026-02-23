#!/bin/bash
# =====================================================
# Rodar load test NA VPS contra localhost (127.0.0.1:3001)
# Assim o limite e so o servidor (Node + Nginx nao entram).
#
# Uso na VPS:
#   cd /var/www/zkpremios-backend
#   chmod +x run-load-test-na-vps.sh
#   bash run-load-test-na-vps.sh [STREAM_ID]
#
# Ou direto:
#   node load-test.js 1500 STREAM_ID http://127.0.0.1:3001 load-test-users.json
# =====================================================

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

STREAM_ID="${1:-b816b205-65e0-418e-8205-c3d56edd76c7}"
URL="http://127.0.0.1:3001"
USERS_JSON="${2:-load-test-users.json}"

if [ ! -f "load-test-users.json" ]; then
  echo "AVISO: load-test-users.json nao encontrado. Copie do seu PC para a VPS."
  echo "Ex.: scp backend/socket-server/load-test-users.json root@IP-VPS:/var/www/zkpremios-backend/"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "Erro: Node nao encontrado. Instale Node 18+."
  exit 1
fi

# Garantir socket.io-client (esta em devDependencies; em producao nao e instalado)
if [ ! -d "node_modules/socket.io-client" ]; then
  echo "[INFO] Instalando socket.io-client para load test..."
  npm install socket.io-client --no-save
fi

echo "=========================================="
echo "LOAD TEST NA VPS (localhost)"
echo "=========================================="
echo "Stream ID: $STREAM_ID"
echo "URL: $URL"
echo "Clientes: 1500"
echo "=========================================="
echo ""

node load-test.js 1500 "$STREAM_ID" "$URL" "$USERS_JSON"
