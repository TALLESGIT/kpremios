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
    Write-Host "[ERRO] Arquivo nao encontrado: $LOCAL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Arquivo local encontrado: $LOCAL_FILE" -ForegroundColor Green
Write-Host "[INFO] Enviando para VPS..." -ForegroundColor Yellow

# Fazer backup do arquivo atual na VPS (via SSH)
Write-Host "[INFO] Fazendo backup do arquivo atual..." -ForegroundColor Yellow
$backupCmd = "cp $REMOTE_PATH ${REMOTE_PATH}.backup.`$(date +%Y%m%d_%H%M%S)"
ssh ${VPS_USER}@${VPS_IP} $backupCmd

# Enviar arquivo via SCP
Write-Host "[INFO] Enviando arquivo..." -ForegroundColor Yellow
scp "$LOCAL_FILE" ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Arquivo enviado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Reiniciando PM2..." -ForegroundColor Yellow
    
    # Reiniciar PM2
    ssh ${VPS_USER}@${VPS_IP} "cd /var/www/zkpremios-backend; pm2 restart zkpremios-socket"
    
    Write-Host ""
    Write-Host "[INFO] Aguardando 3 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    Write-Host ""
    Write-Host "[INFO] Verificando status do PM2..." -ForegroundColor Yellow
    ssh ${VPS_USER}@${VPS_IP} "pm2 list"
    
    Write-Host ""
    Write-Host "[INFO] Verificando logs (ultimas 10 linhas)..." -ForegroundColor Yellow
    ssh ${VPS_USER}@${VPS_IP} "pm2 logs zkpremios-socket --lines 10 --nostream"
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "[OK] ATUALIZACAO CONCLUIDA!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Se o status ainda estiver errored, verifique os logs:" -ForegroundColor Yellow
    Write-Host "  ssh ${VPS_USER}@${VPS_IP} pm2 logs zkpremios-socket --err --lines 50 --nostream" -ForegroundColor Gray
} else {
    Write-Host "[ERRO] Erro ao enviar arquivo!" -ForegroundColor Red
    exit 1
}
