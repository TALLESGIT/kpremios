#!/bin/bash
# Script de diagnóstico para backend Socket.IO na VPS

echo "=========================================="
echo "DIAGNÓSTICO BACKEND SOCKET.IO"
echo "=========================================="
echo ""

echo "1. Verificando logs do PM2 (últimas 50 linhas):"
echo "----------------------------------------"
pm2 logs zkpremios-socket --lines 50 --nostream
echo ""

echo "2. Verificando erros do PM2:"
echo "----------------------------------------"
pm2 logs zkpremios-socket --err --lines 50 --nostream
echo ""

echo "3. Verificando se o arquivo server.js existe:"
echo "----------------------------------------"
if [ -f "server.js" ]; then
    echo "✅ server.js encontrado"
    echo "Tamanho: $(ls -lh server.js | awk '{print $5}')"
    echo "Última modificação: $(stat -c %y server.js)"
else
    echo "❌ server.js NÃO encontrado no diretório atual"
    echo "Diretório atual: $(pwd)"
    echo "Arquivos no diretório:"
    ls -la
fi
echo ""

echo "4. Verificando sintaxe do Node.js:"
echo "----------------------------------------"
if [ -f "server.js" ]; then
    node --check server.js 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Sintaxe OK"
    else
        echo "❌ Erro de sintaxe detectado!"
    fi
fi
echo ""

echo "5. Verificando variáveis de ambiente (.env):"
echo "----------------------------------------"
if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
    echo "Variáveis configuradas:"
    grep -E "^(PORT|NODE_ENV|FRONTEND_URL|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=" .env | sed 's/=.*/=***/' || echo "Nenhuma variável encontrada"
else
    echo "❌ Arquivo .env NÃO encontrado"
    echo "Arquivos disponíveis:"
    ls -la | grep -E "\.env|env\."
fi
echo ""

echo "6. Verificando dependências (node_modules):"
echo "----------------------------------------"
if [ -d "node_modules" ]; then
    echo "✅ node_modules encontrado"
    if [ -d "node_modules/socket.io" ]; then
        echo "✅ socket.io instalado"
    else
        echo "❌ socket.io NÃO instalado"
    fi
    if [ -d "node_modules/@supabase/supabase-js" ]; then
        echo "✅ @supabase/supabase-js instalado"
    else
        echo "❌ @supabase/supabase-js NÃO instalado"
    fi
else
    echo "❌ node_modules NÃO encontrado - execute: npm install"
fi
echo ""

echo "7. Tentando executar server.js diretamente (teste):"
echo "----------------------------------------"
if [ -f "server.js" ]; then
    timeout 5 node server.js 2>&1 || echo "Processo interrompido após 5 segundos (normal se iniciou corretamente)"
else
    echo "❌ server.js não encontrado"
fi
echo ""

echo "8. Verificando porta 3001:"
echo "----------------------------------------"
if command -v netstat &> /dev/null; then
    netstat -tuln | grep 3001 || echo "Porta 3001 não está em uso"
elif command -v ss &> /dev/null; then
    ss -tuln | grep 3001 || echo "Porta 3001 não está em uso"
else
    echo "Comando netstat/ss não disponível"
fi
echo ""

echo "=========================================="
echo "DIAGNÓSTICO CONCLUÍDO"
echo "=========================================="
