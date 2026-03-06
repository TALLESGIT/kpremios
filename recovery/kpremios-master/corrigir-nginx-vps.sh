#!/bin/bash
# Script para corrigir configuração do Nginx na VPS

echo "=========================================="
echo "CORRIGINDO CONFIGURAÇÃO NGINX"
echo "=========================================="
echo ""

# Verificar se o arquivo existe em sites-available
if [ -f "/etc/nginx/sites-available/api.zkoficial.com.br" ]; then
    echo "✅ Arquivo encontrado em sites-available"
    ls -lh /etc/nginx/sites-available/api.zkoficial.com.br
else
    echo "❌ Arquivo NÃO encontrado em sites-available"
    echo "Precisa enviar o arquivo primeiro!"
    exit 1
fi

echo ""
echo "🔗 Removendo symlink antigo (se existir)..."
rm -f /etc/nginx/sites-enabled/api.zkoficial.com.br

echo ""
echo "🔗 Criando novo symlink..."
ln -sf /etc/nginx/sites-available/api.zkoficial.com.br /etc/nginx/sites-enabled/api.zkoficial.com.br

echo ""
echo "✅ Verificando symlink..."
ls -la /etc/nginx/sites-enabled/ | grep api

echo ""
echo "🧪 Testando configuração do Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuração OK! Recarregando Nginx..."
    systemctl reload nginx
    echo ""
    echo "✅ Nginx recarregado!"
    echo ""
    echo "📊 Status do Nginx:"
    systemctl status nginx --no-pager -l | head -10
else
    echo ""
    echo "❌ Erro na configuração! Verifique os erros acima."
    exit 1
fi
