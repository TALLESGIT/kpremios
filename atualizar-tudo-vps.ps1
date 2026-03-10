# Script PowerShell para atualizar TUDO na VPS (Frontend + Backend)
# Execute: .\atualizar-tudo-vps.ps1

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$BACKEND_PATH = "/var/www/zkpremios-backend"
$FRONTEND_PATH = "/var/www/zkpremios-frontend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ATUALIZANDO TUDO NA VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. ATUALIZAR BACKEND (Socket.io)
# ========================================
Write-Host "[PASSO 1/3] ATUALIZANDO BACKEND..." -ForegroundColor Yellow
Write-Host ""

# Nota: O backend na VPS não é um repositório git, por isso usamos scp
Write-Host "[INFO] Enviando server.js e scripts para a VPS..." -ForegroundColor Yellow
scp "backend\socket-server\server.js" "${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/server.js"

# Criar pasta scripts na VPS se não existir e enviar scripts
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${BACKEND_PATH}/scripts"
scp "scripts\sync-football-data.js" "${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/scripts/sync-football-data.js"

Write-Host ""
Write-Host "[INFO] Instalando dependencias do backend (se necessário)..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd $BACKEND_PATH && npm install"

Write-Host ""
Write-Host "[INFO] Reiniciando PM2 (backend)..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "pm2 restart zkpremios-socket --update-env"

Write-Host ""
Write-Host "[OK] Backend atualizado!" -ForegroundColor Green
Write-Host ""

# ========================================
# 2. ATUALIZAR FRONTEND
# ========================================
Write-Host "[PASSO 2/3] ATUALIZANDO FRONTEND..." -ForegroundColor Yellow
Write-Host ""

Write-Host "[INFO] O frontend é hospedado no Vercel (https://www.zkoficial.com.br)." -ForegroundColor Cyan
Write-Host "[INFO] O deploy no Vercel é automático ao fazer 'git push origin master'." -ForegroundColor Cyan
Write-Host "[SKIP] Pulando atualização local na VPS pois o diretório não existe e o site está no Vercel." -ForegroundColor Gray

Write-Host ""
Write-Host "[OK] Frontend (Vercel) em processo de deploy via GitHub!" -ForegroundColor Green
Write-Host ""

# ========================================
# 3. VERIFICAR STATUS
# ========================================
Write-Host "[PASSO 3/3] VERIFICANDO STATUS..." -ForegroundColor Yellow
Write-Host ""

Write-Host "[INFO] Status do PM2:" -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "pm2 list"

Write-Host ""
Write-Host "[INFO] Ultimas 10 linhas de log do backend:" -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "pm2 logs zkpremios-socket --lines 10 --nostream"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[OK] ATUALIZACAO COMPLETA CONCLUIDA!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Frontend: https://www.zkoficial.com.br" -ForegroundColor Cyan
Write-Host "[INFO] Backend: wss://api.zkoficial.com.br" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se houver algum problema, verifique os logs:" -ForegroundColor Yellow
Write-Host "  ssh ${VPS_USER}@${VPS_IP} pm2 logs zkpremios-socket" -ForegroundColor Gray
Write-Host ""
