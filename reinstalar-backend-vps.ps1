# Script PowerShell para REINSTALAR backend na VPS do zero
# Este script faz backup, limpa tudo e reinstala

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$REMOTE_PATH = "/var/www/zkpremios-backend"
$LOCAL_BACKEND = "backend\socket-server"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "REINSTALAÇÃO COMPLETA DO BACKEND NA VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Este script vai:" -ForegroundColor Yellow
Write-Host "   1. Fazer backup dos arquivos atuais" -ForegroundColor Yellow
Write-Host "   2. Parar e deletar o processo PM2" -ForegroundColor Yellow
Write-Host "   3. Limpar o diretório do backend" -ForegroundColor Yellow
Write-Host "   4. Enviar arquivos novos" -ForegroundColor Yellow
Write-Host "   5. Instalar dependências" -ForegroundColor Yellow
Write-Host "   6. Reiniciar o servidor" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Deseja continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📦 PASSO 1: Fazendo backup dos arquivos atuais..." -ForegroundColor Yellow
$backupCmd = "ssh ${VPS_USER}@${VPS_IP} 'cd /var/www && if [ -d zkpremios-backend ]; then tar -czf zkpremios-backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz zkpremios-backend && echo Backup criado; else echo Diretorio nao existe; fi'"
Invoke-Expression $backupCmd

Write-Host ""
Write-Host "🛑 PASSO 2: Parando e deletando processo PM2..." -ForegroundColor Yellow
$stopCmd = "ssh ${VPS_USER}@${VPS_IP} 'pm2 stop zkpremios-socket 2>/dev/null; pm2 delete zkpremios-socket 2>/dev/null; pm2 save; echo PM2 limpo'"
Invoke-Expression $stopCmd

Write-Host ""
Write-Host "🗑️  PASSO 3: Limpando diretório do backend..." -ForegroundColor Yellow
$cleanCmd = "ssh ${VPS_USER}@${VPS_IP} 'rm -rf ${REMOTE_PATH}/* && mkdir -p ${REMOTE_PATH} && echo Diretorio limpo'"
Invoke-Expression $cleanCmd

Write-Host ""
Write-Host "📤 PASSO 4: Enviando arquivos novos..." -ForegroundColor Yellow

# Verificar se o diretório local existe
if (-not (Test-Path $LOCAL_BACKEND)) {
    Write-Host "❌ Erro: Diretório local não encontrado: $LOCAL_BACKEND" -ForegroundColor Red
    exit 1
}

# Enviar todos os arquivos do backend
Write-Host "   Enviando arquivos..." -ForegroundColor Gray
$scpCmd = "scp -r ${LOCAL_BACKEND}\* ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/"
Invoke-Expression $scpCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao enviar arquivos!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivos enviados!" -ForegroundColor Green

Write-Host ""
Write-Host "📦 PASSO 5: Instalando dependências..." -ForegroundColor Yellow
$installCmd = "ssh ${VPS_USER}@${VPS_IP} 'cd ${REMOTE_PATH} && npm install && echo Dependencias instaladas'"
Invoke-Expression $installCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 PASSO 6: Verificando arquivo .env..." -ForegroundColor Yellow
$envCheck = "ssh ${VPS_USER}@${VPS_IP} 'cd ${REMOTE_PATH} && if [ -f .env ]; then echo .env existe; else echo .env NAO EXISTE - precisa criar; fi'"
Invoke-Expression $envCheck

Write-Host ""
Write-Host "🚀 PASSO 7: Iniciando servidor..." -ForegroundColor Yellow
$startCmd = "ssh ${VPS_USER}@${VPS_IP} 'cd ${REMOTE_PATH} && pm2 start server.js --name zkpremios-socket && pm2 save && echo Servidor iniciado'"
Invoke-Expression $startCmd

Write-Host ""
Write-Host "⏳ Aguardando 5 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "📊 Verificando status..." -ForegroundColor Yellow
$statusCmd = "ssh ${VPS_USER}@${VPS_IP} 'pm2 list'"
Invoke-Expression $statusCmd

Write-Host ""
Write-Host "📋 Verificando logs (últimas 20 linhas)..." -ForegroundColor Yellow
$logsCmd = "ssh ${VPS_USER}@${VPS_IP} 'pm2 logs zkpremios-socket --lines 20 --nostream'"
Invoke-Expression $logsCmd

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ REINSTALAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique se o status está 'online'" -ForegroundColor Gray
Write-Host "2. Se houver erros, verifique o arquivo .env" -ForegroundColor Gray
Write-Host "3. Teste o health check: curl http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Backup salvo em: /var/www/zkpremios-backend-backup-*.tar.gz" -ForegroundColor Gray
