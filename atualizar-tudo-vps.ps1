# Script PowerShell para atualizar TUDO na VPS (Frontend + Backend)
# Execute: .\atualizar-tudo-vps.ps1

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$BACKEND_PATH = "/var/www/zkpremios-backend"
$FRONTEND_PATH = "/var/www/zkpremios-frontend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Adicionar OpenSSH ao PATH para esta sessao (Resolve erro de scp/ssh nao encontrado)
$env:Path = "C:\Windows\System32\OpenSSH;" + "C:\Program Files\Git\usr\bin;" + $env:Path

# Testar se os comandos estao acessiveis
if (-not (Get-Command "scp" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] Comando 'scp' nao encontrado. Verifique a instalacao do OpenSSH." -ForegroundColor Red
    exit 1
}

# Nota: O backend na VPS não é um repositório git, por isso usamos scp
Write-Host "[INFO] Enviando arquivos do backend (server, package, ecosystem)..." -ForegroundColor Yellow
scp "backend\socket-server\server.js" "${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/server.js"
scp "backend\socket-server\package.json" "${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/package.json"
scp "backend\socket-server\ecosystem.config.js" "${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/ecosystem.config.js"

# 2. ATUALIZAR CONFIGURAÇÃO DE VÍDEO (MediaMTX)
Write-Host "[INFO] Enviando configuração do MediaMTX (LL-HLS)..." -ForegroundColor Yellow
# Nota: O MediaMTX está localizado em /opt/mediamtx/ conforme diagnóstico
scp "mediamtx.yml" "${VPS_USER}@${VPS_IP}:/opt/mediamtx/mediamtx.yml"

# Criar pasta scripts na VPS se não existir e enviar scripts
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${BACKEND_PATH}/scripts"
scp "scripts\sync-football-data.cjs" "${VPS_USER}@${VPS_IP}:${BACKEND_PATH}/scripts/sync-football-data.cjs"

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
