# Script PowerShell para DIAGNOSTICAR problemas na VPS
# Execute: .\diagnosticar-vps.ps1

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO DA VPS - LIVE CAINDO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. VERIFICAR STATUS DO PM2
# ========================================
Write-Host "[1/7] STATUS DO PM2" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "pm2 list"
Write-Host ""

# ========================================
# 2. VERIFICAR MEMORIA E CPU
# ========================================
Write-Host "[2/7] USO DE MEMORIA E CPU" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "free -h && echo '' && top -bn1 | head -15"
Write-Host ""

# ========================================
# 3. VERIFICAR LOGS DE ERRO DO BACKEND
# ========================================
Write-Host "[3/7] LOGS DE ERRO DO BACKEND (ultimas 30 linhas)" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "pm2 logs zkpremios-socket --err --lines 30 --nostream"
Write-Host ""

# ========================================
# 4. VERIFICAR LOGS NORMAIS DO BACKEND
# ========================================
Write-Host "[4/7] LOGS NORMAIS DO BACKEND (ultimas 20 linhas)" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "pm2 logs zkpremios-socket --out --lines 20 --nostream"
Write-Host ""

# ========================================
# 5. VERIFICAR CONEXOES ATIVAS
# ========================================
Write-Host "[5/7] CONEXOES ATIVAS NA PORTA 3001 (Socket.io)" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "netstat -an | grep :3001 | wc -l && echo 'conexoes ativas na porta 3001'"
Write-Host ""

# ========================================
# 6. VERIFICAR ESPACO EM DISCO
# ========================================
Write-Host "[6/7] ESPACO EM DISCO" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "df -h"
Write-Host ""

# ========================================
# 7. VERIFICAR VARIAVEIS DE AMBIENTE
# ========================================
Write-Host "[7/7] VARIAVEIS DE AMBIENTE DO BACKEND" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_IP} "cd /var/www/zkpremios-backend && cat .env | grep -v 'KEY\|SECRET\|PASSWORD' | head -10"
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO COMPLETO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ANALISE OS LOGS ACIMA PARA IDENTIFICAR:" -ForegroundColor Yellow
Write-Host "  1. Erros 400 (Invalid login credentials)" -ForegroundColor White
Write-Host "  2. Erros de memoria (OOM - Out of Memory)" -ForegroundColor White
Write-Host "  3. Erros de conexao (ECONNREFUSED, ETIMEDOUT)" -ForegroundColor White
Write-Host "  4. PM2 com status 'errored' ou 'stopped'" -ForegroundColor White
Write-Host "  5. Uso de memoria acima de 80%" -ForegroundColor White
Write-Host "  6. Disco cheio (acima de 90%)" -ForegroundColor White
Write-Host ""
Write-Host "Se encontrar erros, me mostre os logs!" -ForegroundColor Cyan
Write-Host ""
