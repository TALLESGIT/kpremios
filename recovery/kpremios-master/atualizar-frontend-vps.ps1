# Script PowerShell para atualizar APENAS FRONTEND na VPS
# Execute: .\atualizar-frontend-vps.ps1

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$FRONTEND_PATH = "/var/www/zkpremios-frontend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ATUALIZANDO FRONTEND NA VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Fazendo pull do GitHub..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd $FRONTEND_PATH && git pull origin master"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Erro ao fazer pull do GitHub!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd $FRONTEND_PATH && npm install"

Write-Host ""
Write-Host "[INFO] Buildando frontend (isso pode demorar 2-3 minutos)..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd $FRONTEND_PATH && npm run build"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "[OK] FRONTEND ATUALIZADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[INFO] Acesse: https://www.zkoficial.com.br" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERRO] Erro ao buildar frontend!" -ForegroundColor Red
    Write-Host "Verifique os logs acima para mais detalhes." -ForegroundColor Yellow
    exit 1
}
