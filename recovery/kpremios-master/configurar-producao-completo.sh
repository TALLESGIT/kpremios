#!/bin/bash
# Script completo para configurar produção WebSocket
# Execute na VPS: bash configurar-producao-completo.sh

set -e

echo "=========================================="
echo "CONFIGURAÇÃO COMPLETA - WEBSOCKET PRODUÇÃO"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Configurar NODE_ENV no .env
echo -e "${YELLOW}1. Configurando NODE_ENV no .env...${NC}"
cd /var/www/zkpremios-backend

if [ -f .env ]; then
    # Verificar se NODE_ENV já existe
    if grep -q "^NODE_ENV=" .env; then
        # Atualizar
        sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env
        echo -e "${GREEN}✅ NODE_ENV atualizado para production${NC}"
    else
        # Adicionar
        echo "" >> .env
        echo "NODE_ENV=production" >> .env
        echo -e "${GREEN}✅ NODE_ENV adicionado como production${NC}"
    fi
else
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    exit 1
fi

# 2. Configurar map no nginx.conf
echo ""
echo -e "${YELLOW}2. Configurando map WebSocket no nginx.conf...${NC}"

# Verificar se map já existe
if grep -q "map \$http_upgrade \$connection_upgrade" /etc/nginx/nginx.conf; then
    echo -e "${GREEN}✅ Map já existe no nginx.conf${NC}"
else
    # Adicionar map no nginx.conf (dentro do bloco http)
    # Criar backup
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # Adicionar map após a linha "http {"
    sed -i '/^http {/a\
    # Map para WebSocket upgrade\
    map $http_upgrade $connection_upgrade {\
        default upgrade;\
        '\'''\''      close;\
    }\
' /etc/nginx/nginx.conf
    
    echo -e "${GREEN}✅ Map adicionado ao nginx.conf${NC}"
fi

# 3. Testar configuração do Nginx
echo ""
echo -e "${YELLOW}3. Testando configuração do Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Configuração do Nginx OK${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx!${NC}"
    exit 1
fi

# 4. Recarregar Nginx
echo ""
echo -e "${YELLOW}4. Recarregando Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx recarregado${NC}"

# 5. Reiniciar PM2 com ecosystem.config.js (se existir)
echo ""
echo -e "${YELLOW}5. Configurando PM2...${NC}"

if [ -f ecosystem.config.js ]; then
    echo -e "${GREEN}✅ ecosystem.config.js encontrado${NC}"
    pm2 delete zkpremios-socket 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}✅ PM2 reiniciado com ecosystem.config.js${NC}"
else
    echo -e "${YELLOW}⚠️  ecosystem.config.js não encontrado, usando restart normal${NC}"
    pm2 restart zkpremios-socket --update-env
    pm2 save
fi

# 6. Aguardar e verificar
echo ""
echo -e "${YELLOW}6. Aguardando inicialização...${NC}"
sleep 5

# 7. Verificar status
echo ""
echo -e "${YELLOW}7. Verificando status...${NC}"
echo ""
pm2 list
echo ""

# 8. Verificar logs
echo -e "${YELLOW}8. Últimos logs do backend:${NC}"
pm2 logs zkpremios-socket --lines 10 --nostream | tail -10
echo ""

# 9. Verificar NODE_ENV
echo -e "${YELLOW}9. Verificando NODE_ENV:${NC}"
pm2 env 0 | grep NODE_ENV || echo "NODE_ENV não encontrado no PM2 (verificar .env)"
echo ""

# 10. Testar health check
echo -e "${YELLOW}10. Testando health check:${NC}"
curl -s http://localhost:3001/health | head -3
echo ""

echo "=========================================="
echo -e "${GREEN}✅ CONFIGURAÇÃO CONCLUÍDA!${NC}"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Verificar se NODE_ENV está como 'production' nos logs"
echo "2. Testar WebSocket no navegador"
echo "3. Verificar logs: pm2 logs zkpremios-socket --lines 0"
echo ""
