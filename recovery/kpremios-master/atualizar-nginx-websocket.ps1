# Script PowerShell para atualizar configuração do Nginx na VPS
# Remove HTTP/2 para permitir WebSocket upgrade

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$NGINX_CONFIG = "nginx-api.zkoficial.com.br.conf"
$REMOTE_PATH = "/etc/nginx/sites-available/api.zkoficial.com.br"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ATUALIZAR NGINX PARA WEBSOCKET" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Enviando configuração atualizada do Nginx..." -ForegroundColor Yellow
scp $NGINX_CONFIG "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao enviar arquivo!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo enviado com sucesso!" -ForegroundColor Green
Write-Host ""

Write-Host "2. Conectando à VPS para atualizar Nginx..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" @"
# Testar configuração do Nginx
echo 'Testando configuração do Nginx...'
nginx -t

if [ \$? -eq 0 ]; then
    echo '✅ Configuração válida!'
    echo ''
    echo 'Recarregando Nginx...'
    systemctl reload nginx
    echo '✅ Nginx recarregado!'
    echo ''
    echo 'Verificando status do Nginx:'
    systemctl status nginx --no-pager -l | head -10
else
    echo '❌ Erro na configuração do Nginx!'
    echo 'Verifique os logs acima.'
    exit 1
fi
"@

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ATUALIZAÇÃO CONCLUÍDA" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Teste a conexão WebSocket no navegador" -ForegroundColor White
Write-Host "2. Verifique os logs: pm2 logs zkpremios-socket" -ForegroundColor White
Write-Host "3. Teste com: curl -v -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' https://api.zkoficial.com.br/socket.io/?EIO=4&transport=websocket" -ForegroundColor White
