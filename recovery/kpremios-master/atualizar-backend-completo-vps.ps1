# Script PowerShell para atualizar TODOS os arquivos do backend na VPS
# Execute: .\atualizar-backend-completo-vps.ps1

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$REMOTE_DIR = "/var/www/zkpremios-backend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ATUALIZANDO BACKEND COMPLETO NA VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Arquivos para enviar
$files = @(
    "backend\socket-server\server.js",
    "backend\socket-server\resilient-cache.js",
    "backend\socket-server\supabase-wrapper.js"
)

# Verificar se todos os arquivos existem
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "[ERRO] Arquivo nao encontrado: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] Todos os arquivos encontrados localmente" -ForegroundColor Green
Write-Host ""

# Enviar cada arquivo
foreach ($file in $files) {
    $fileName = Split-Path $file -Leaf
    Write-Host "[INFO] Enviando $fileName..." -ForegroundColor Yellow
    scp "$file" ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/$fileName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Erro ao enviar $fileName!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] $fileName enviado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[INFO] Reiniciando PM2..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd $REMOTE_DIR; pm2 restart zkpremios-socket"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Erro ao reiniciar PM2!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[INFO] Aguardando 5 segundos para estabilizacao..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "[INFO] Verificando status do PM2..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "pm2 list"

Write-Host ""
Write-Host "[INFO] Verificando logs (ultimas 20 linhas)..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "pm2 logs zkpremios-socket --lines 20 --nostream"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[OK] ATUALIZACAO COMPLETA CONCLUIDA!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sistema resiliente ativado!" -ForegroundColor Green
Write-Host "A live agora funciona mesmo se o Supabase cair!" -ForegroundColor Green
Write-Host ""
Write-Host "Para monitorar em tempo real:" -ForegroundColor Yellow
Write-Host "  ssh ${VPS_USER}@${VPS_IP} pm2 logs zkpremios-socket" -ForegroundColor Gray
Write-Host ""
Write-Host "Para verificar saude do cache:" -ForegroundColor Yellow
Write-Host "  curl http://${VPS_IP}:3001/health" -ForegroundColor Gray
