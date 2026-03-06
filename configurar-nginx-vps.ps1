# Script PowerShell para configurar Nginx na VPS
# Configura proxy reverso para WebSocket (Socket.IO)

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$DOMAIN = "api.zkoficial.com.br"
$NGINX_CONFIG = "nginx-api.zkoficial.com.br.conf"
$REMOTE_CONFIG_PATH = "/etc/nginx/sites-available/$DOMAIN"
$REMOTE_ENABLED_PATH = "/etc/nginx/sites-enabled/$DOMAIN"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CONFIGURAR NGINX PARA WEBSOCKET" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Domínio: $DOMAIN" -ForegroundColor Yellow
Write-Host "Backend: localhost:3001" -ForegroundColor Yellow
Write-Host ""

# Verificar se o arquivo de configuração existe
if (-not (Test-Path $NGINX_CONFIG)) {
    Write-Host "❌ Erro: Arquivo $NGINX_CONFIG não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo de configuração encontrado: $NGINX_CONFIG" -ForegroundColor Green
Write-Host ""

Write-Host "📤 PASSO 1: Enviando configuração para VPS..." -ForegroundColor Yellow
$scpCmd = "scp `"$NGINX_CONFIG`" ${VPS_USER}@${VPS_IP}:${REMOTE_CONFIG_PATH}"
Invoke-Expression $scpCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao enviar arquivo!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuração enviada!" -ForegroundColor Green
Write-Host ""

Write-Host "🔗 PASSO 2: Criando symlink para sites-enabled..." -ForegroundColor Yellow
$symlinkCmd = "ssh ${VPS_USER}@${VPS_IP} 'ln -sf ${REMOTE_CONFIG_PATH} ${REMOTE_ENABLED_PATH} && echo Symlink criado'"
Invoke-Expression $symlinkCmd

Write-Host ""
Write-Host "🧪 PASSO 3: Testando configuração do Nginx..." -ForegroundColor Yellow
$testCmd = "ssh ${VPS_USER}@${VPS_IP} 'nginx -t'"
Invoke-Expression $testCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro na configuração do Nginx! Verifique os logs acima." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Configuração do Nginx está válida!" -ForegroundColor Green
Write-Host ""

Write-Host "🔄 PASSO 4: Recarregando Nginx..." -ForegroundColor Yellow
$reloadCmd = "ssh ${VPS_USER}@${VPS_IP} 'systemctl reload nginx && echo Nginx recarregado'"
Invoke-Expression $reloadCmd

Write-Host ""
Write-Host "📊 PASSO 5: Verificando status do Nginx..." -ForegroundColor Yellow
$statusCmd = "ssh ${VPS_USER}@${VPS_IP} 'systemctl status nginx --no-pager -l'"
Invoke-Expression $statusCmd

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ NGINX CONFIGURADO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configurar SSL (Let's Encrypt):" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor Gray
Write-Host "   certbot --nginx -d $DOMAIN" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Testar conexão:" -ForegroundColor White
Write-Host "   https://$DOMAIN/health" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verificar logs do Nginx:" -ForegroundColor White
Write-Host "   tail -f /var/log/nginx/$DOMAIN-access.log" -ForegroundColor Gray
Write-Host "   tail -f /var/log/nginx/$DOMAIN-error.log" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Se o domínio já tem SSL, pule o passo 1" -ForegroundColor Yellow
Write-Host ""
