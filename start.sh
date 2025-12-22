#!/bin/bash

echo "========================================"
echo "  ZK Oficial - Iniciando Projeto"
echo "========================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Por favor, instale Node.js de https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js encontrado"
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "[AVISO] Arquivo .env não encontrado!"
    echo "Criando arquivo .env de exemplo..."
    cp .env.example .env 2>/dev/null || touch .env
    echo ""
    echo "[IMPORTANTE] Configure o arquivo .env com suas credenciais do Supabase!"
    echo "Pressione Enter para continuar ou Ctrl+C para cancelar..."
    read
fi

echo "[OK] Arquivo .env encontrado"
echo ""

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências!"
        exit 1
    fi
    echo "[OK] Dependências instaladas"
    echo ""
fi

echo "========================================"
echo "  Iniciando servidor de desenvolvimento"
echo "========================================"
echo ""
echo "Acesse: http://localhost:5173"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar o servidor
npm run dev

