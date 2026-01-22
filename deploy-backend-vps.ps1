# Deploy Script Simplificado

$VPS_USER = "root"
$VPS_IP = "76.13.82.48"
$VPS_PATH = "/var/www/zkpremios-backend"
$PM2_NAME = "zkpremios-socket"
$LOCAL_FILE = "backend\socket-server\server.js"
$LOCAL_ENV = "backend\socket-server\.env"
$TARGET_JS = "${VPS_USER}@${VPS_IP}:${VPS_PATH}/server.js"
$TARGET_ENV = "${VPS_USER}@${VPS_IP}:${VPS_PATH}/.env"

Write-Host "--- INICIANDO DEPLOY ---" -ForegroundColor Cyan

# 1. Verificar Arquivos
if (-not (Test-Path $LOCAL_FILE)) {
    Write-Host "Erro: Arquivo server.js nao encontrado!" -ForegroundColor Red
    exit 1
}

# 2. Upload JS
Write-Host "Enviando server.js..." -ForegroundColor Yellow
scp $LOCAL_FILE $TARGET_JS

# 3. Upload ENV (Opcional se existir)
if (Test-Path $LOCAL_ENV) {
    Write-Host "Enviando .env..." -ForegroundColor Yellow
    scp $LOCAL_ENV $TARGET_ENV
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Upload concluido!" -ForegroundColor Green
    
    # 4. Reiniciar PM2 com update-env
    Write-Host "Reiniciando servidor (PM2)..." -ForegroundColor Yellow
    ssh "$VPS_USER@$VPS_IP" "pm2 restart $PM2_NAME --update-env"
    
    Write-Host "--- DEPLOY CONCLUIDO COM SUCESSO ---" -ForegroundColor Cyan
} else {
    Write-Host "Erro durante o deploy." -ForegroundColor Red
}

