# Script de Deploy Manual - KPremios
$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$REMOTE_PATH = "/var/www/zkpremios-backend"

Write-Host "--- Iniciando Deploy para VPS ($VPS_IP) ---" -ForegroundColor Cyan

# 1. Enviar arquivos via SCP
Write-Host "[1/3] Enviando arquivos para a VPS..." -ForegroundColor Yellow
scp -r backend/socket-server/* ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}

# 2. Executar comandos remotos
Write-Host "[2/3] Instalando dependencias e reiniciando PM2..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd ${REMOTE_PATH} && npm install --production && pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js && pm2 save"

Write-Host "--- Deploy Concluido com Sucesso! ---" -ForegroundColor Green
