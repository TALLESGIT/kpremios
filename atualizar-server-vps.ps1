# Script PowerShell para atualizar server.js na VPS
# Execute: .\atualizar-server-vps.ps1

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$LOCAL_FILE = "backend\socket-server\server.js"
$REMOTE_PATH = "/var/www/zkpremios-backend/server.js"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ATUALIZANDO server.js NA VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo local existe
if (-not (Test-Path $LOCAL_FILE)) {
    Write-Host "❌ Erro: Arquivo não encontrado: $LOCAL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo local encontrado: $LOCAL_FILE" -ForegroundColor Green
Write-Host "📤 Enviando para VPS..." -ForegroundColor Yellow

# Fazer backup do arquivo atual na VPS (via SSH)
Write-Host "💾 Fazendo backup do arquivo atual..." -ForegroundColor Yellow
$backupCommand = "ssh ${VPS_USER}@${VPS_IP} 'cp $REMOTE_PATH ${REMOTE_PATH}.backup.$(date +%Y%m%d_%H%M%S)'"
Invoke-Expression $backupCommand

# Enviar arquivo via SCP
Write-Host "📤 Enviando arquivo..." -ForegroundColor Yellow
$scpCommand = "scp `"$LOCAL_FILE`" ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}"
Invoke-Expression $scpCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Arquivo enviado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Reiniciando PM2..." -ForegroundColor Yellow
    
    # Reiniciar PM2
    $restartCommand = "ssh ${VPS_USER}@${VPS_IP} 'cd /var/www/zkpremios-backend && pm2 restart zkpremios-socket'"
    Invoke-Expression $restartCommand
    
    Write-Host ""
    Write-Host "⏳ Aguardando 3 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    Write-Host ""
    Write-Host "📊 Verificando status do PM2..." -ForegroundColor Yellow
    $statusCommand = "ssh ${VPS_USER}@${VPS_IP} 'pm2 list'"
    Invoke-Expression $statusCommand
    
    Write-Host ""
    Write-Host "📋 Verificando logs (últimas 10 linhas)..." -ForegroundColor Yellow
    $logsCommand = "ssh ${VPS_USER}@${VPS_IP} 'pm2 logs zkpremios-socket --lines 10 --nostream'"
    Invoke-Expression $logsCommand
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ ATUALIZAÇÃO CONCLUÍDA!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Se o status ainda estiver 'errored', verifique os logs:" -ForegroundColor Yellow
    Write-Host "  ssh ${VPS_USER}@${VPS_IP} 'pm2 logs zkpremios-socket --err --lines 50 --nostream'" -ForegroundColor Gray
} else {
    Write-Host "❌ Erro ao enviar arquivo!" -ForegroundColor Red
    exit 1
}
