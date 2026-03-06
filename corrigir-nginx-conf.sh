#!/bin/bash
# Script para corrigir nginx.conf após erro de sintaxe

echo "=========================================="
echo "CORRIGINDO NGINX.CONF"
echo "=========================================="
echo ""

# Fazer backup
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"
cp /etc/nginx/nginx.conf "$BACKUP_FILE"
echo "✅ Backup criado: $BACKUP_FILE"
echo ""

# Verificar se há erro de sintaxe
echo "Verificando sintaxe atual..."
if nginx -t 2>&1 | grep -q "unexpected"; then
    echo "❌ Erro de sintaxe detectado"
    echo ""
    
    # Tentar restaurar do backup anterior (se existir)
    if [ -f /etc/nginx/nginx.conf.backup.* ]; then
        LATEST_BACKUP=$(ls -t /etc/nginx/nginx.conf.backup.* | head -1)
        echo "Restaurando do backup: $LATEST_BACKUP"
        cp "$LATEST_BACKUP" /etc/nginx/nginx.conf
    fi
fi

echo ""
echo "📝 Adicionando map WebSocket corretamente..."
echo ""

# Ler o arquivo atual
TEMP_FILE=$(mktemp)

# Processar o arquivo linha por linha
IN_HTTP_BLOCK=0
MAP_ADDED=0

while IFS= read -r line; do
    # Detectar início do bloco http
    if [[ "$line" =~ ^http[[:space:]]*\{ ]]; then
        IN_HTTP_BLOCK=1
        echo "$line" >> "$TEMP_FILE"
        # Adicionar map logo após http {
        echo "" >> "$TEMP_FILE"
        echo "    # Map para WebSocket upgrade" >> "$TEMP_FILE"
        echo "    map \$http_upgrade \$connection_upgrade {" >> "$TEMP_FILE"
        echo "        default upgrade;" >> "$TEMP_FILE"
        echo "        ''      close;" >> "$TEMP_FILE"
        echo "    }" >> "$TEMP_FILE"
        echo "" >> "$TEMP_FILE"
        MAP_ADDED=1
        continue
    fi
    
    # Se já adicionamos o map e encontramos outro map, pular (evitar duplicata)
    if [ $MAP_ADDED -eq 1 ] && [[ "$line" =~ map.*upgrade ]]; then
        echo "    # Map duplicado removido" >> "$TEMP_FILE"
        # Pular as próximas 4 linhas (o bloco map)
        for i in {1..4}; do
            read -r line || break
        done
        continue
    fi
    
    echo "$line" >> "$TEMP_FILE"
done < /etc/nginx/nginx.conf

# Se não encontrou bloco http, adicionar manualmente
if [ $MAP_ADDED -eq 0 ]; then
    echo "⚠️  Bloco http não encontrado. Adicionando manualmente..."
    # Adicionar no início do arquivo (assumindo estrutura padrão)
    sed -i '1a\
# Map para WebSocket upgrade\
map $http_upgrade $connection_upgrade {\
    default upgrade;\
    '\'''\''      close;\
}\
' /etc/nginx/nginx.conf
fi

# Se usamos temp file, substituir
if [ -f "$TEMP_FILE" ]; then
    mv "$TEMP_FILE" /etc/nginx/nginx.conf
fi

echo ""
echo "🧪 Testando configuração..."
if nginx -t; then
    echo ""
    echo "✅ Configuração OK! Recarregando Nginx..."
    systemctl reload nginx
    echo ""
    echo "✅ Nginx recarregado com sucesso!"
    echo ""
    echo "📊 Verificando map:"
    nginx -T | grep -A 3 "map.*upgrade" || echo "Map não encontrado (pode estar correto)"
else
    echo ""
    echo "❌ Ainda há erros. Restaurando backup..."
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" /etc/nginx/nginx.conf
        echo "✅ Backup restaurado"
        echo ""
        echo "Por favor, edite manualmente:"
        echo "  nano /etc/nginx/nginx.conf"
        echo ""
        echo "E adicione dentro do bloco http { (logo após a linha 'http {'):"
        echo ""
        echo "    map \$http_upgrade \$connection_upgrade {"
        echo "        default upgrade;"
        echo "        ''      close;"
        echo "    }"
    fi
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ CORREÇÃO CONCLUÍDA"
echo "=========================================="
