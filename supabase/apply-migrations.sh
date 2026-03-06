#!/bin/bash

# Script para aplicar todas as migrações do Supabase
# Uso: ./apply-migrations.sh

echo "🚀 Aplicando migrações do Supabase..."
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não está instalado!"
    echo "   Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar se o projeto está linkado
if ! supabase status &> /dev/null; then
    echo "❌ Projeto Supabase não está linkado!"
    echo "   Execute: supabase link --project-ref SEU_PROJECT_ID"
    exit 1
fi

echo "✅ Projeto linkado"
echo ""

# Aplicar migrações
echo "📝 Aplicando migrações..."
supabase db push

echo ""
echo "✅ Migrações aplicadas!"
echo ""
echo "👤 Usuário admin padrão:"
echo "   Email: admin@zkpremios.com"
echo "   Senha: admin123"
echo "   ⚠️  Altere a senha após o primeiro login!"
echo ""
echo "📚 Consulte: supabase/MIGRACAO_COMPLETA.md para mais informações"

