# Script PowerShell para atualizar backend na VPS
# Uso: .\deploy-backend-vps.ps1

Write-Host "🚀 Deploy do Backend para VPS" -ForegroundColor Cyan
Write-Host ""

# Configurações - AJUSTE AQUI COM SEUS DADOS
$VPS_USER = "root"  # Seu usuário na VPS
$VPS_IP = "SEU_IP_AQUI"  # IP da sua VPS
$VPS_PATH = "/var/www/zkpremios-backend"  # Caminho do backend na VPS (ou /home/usuario/socket-server)
$PM2_NAME = "socket-server"  # Nome do processo no PM2 (ou zkpremios-socket)

Write-Host "📋 Configurações:" -ForegroundColor Yellow
Write-Host "  VPS: $VPS_USER@$VPS_IP" -ForegroundColor Gray
Write-Host "  Caminho: $VPS_PATH" -ForegroundColor Gray
Write-Host "  PM2: $PM2_NAME" -ForegroundColor Gray
Write-Host ""

# Verificar se o arquivo existe
$serverFile = "backend\socket-server\server.js"
if (-not (Test-Path $serverFile)) {
    Write-Host "❌ Erro: Arquivo $serverFile não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo encontrado: $serverFile" -ForegroundColor Green
Write-Host ""

# Confirmar antes de continuar
$confirm = Read-Host "Deseja continuar com o deploy? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "❌ Deploy cancelado." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📤 Enviando arquivo para VPS..." -ForegroundColor Cyan

# Enviar arquivo via SCP
try {
    scp $serverFile "${VPS_USER}@${VPS_IP}:${VPS_PATH}/server.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Arquivo enviado com sucesso!" -ForegroundColor Green
        Write-Host ""
        
        # Reiniciar PM2 na VPS
        Write-Host "🔄 Reiniciando servidor na VPS..." -ForegroundColor Cyan
        ssh "${VPS_USER}@${VPS_IP}" "cd $VPS_PATH && pm2 restart $PM2_NAME"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Servidor reiniciado com sucesso!" -ForegroundColor Green
            Write-Host ""
            
            # Verificar status
            Write-Host "📊 Verificando status do servidor..." -ForegroundColor Cyan
            ssh "${VPS_USER}@${VPS_IP}" "pm2 status $PM2_NAME"
            Write-Host ""
            
            # Mostrar últimos logs
            Write-Host "📝 Últimos logs (50 linhas):" -ForegroundColor Cyan
            ssh "${VPS_USER}@${VPS_IP}" "pm2 logs $PM2_NAME --lines 50 --nostream"
            
        } else {
            Write-Host "⚠️ Erro ao reiniciar servidor. Verifique manualmente." -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Erro ao enviar arquivo!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erro: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Dica: Certifique-se de que:" -ForegroundColor Yellow
    Write-Host "  1. Você tem acesso SSH configurado (chave SSH ou senha)" -ForegroundColor Gray
    Write-Host "  2. O caminho da VPS está correto" -ForegroundColor Gray
    Write-Host "  3. O usuário tem permissões na pasta" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "🎉 Deploy concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Para ver logs em tempo real, execute:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_IP} 'pm2 logs $PM2_NAME'" -ForegroundColor Gray
