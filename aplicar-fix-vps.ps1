# =====================================================
# ZK OFICIAL - CONFIGURAR TRANSCODING AAC NA VPS (V5)
# =====================================================

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$VPS_PASS = "G7&h-P2@qK+n#vL9"

Write-Host "[1/2] Gerando script de reparo..." -ForegroundColor Cyan

# Script em formato Linux puro
$remoteScript = @'
#!/bin/bash
echo "--- INICIANDO CONFIGURACAO ---"

# 1. Localizar arquivo
F=""
for p in "/opt/mediamtx/mediamtx.yml" "/etc/mediamtx.yml" "/usr/local/etc/mediamtx.yml"; do
    if [ -f "$p" ]; then F="$p"; break; tel; fi
done

if [ -z "$F" ]; then
    echo "ERRO: mediamtx.yml não encontrado!"
    exit 1
fi

echo "Arquivo encontrado em: $F"
cp "$F" "$F.bak"

# 2. Instalar FFmpeg se necessário
if ! command -v ffmpeg &> /dev/null; then
    apt-get update && apt-get install -y ffmpeg
fi

# 3. Limpar runOnPublish se já existir
sed -i '/runOnPublish:/d' "$F"

# 4. Adicionar o comando usando uma técnica de substituição mais segura
# Usamos o caractere @ como delimitador no sed para não conflitar com / das URLs
sed -i "s@writeQueueSize: 384@writeQueueSize: 384\n    runOnPublish: ffmpeg -i srt://localhost:\$SRT_PORT?streamid=read:\$SRT_PATH -c:v copy -c:a aac -b:a 128k -f rtsp rtsp://localhost:\$RTSP_PORT/\$RTSP_PATH_aac@" "$F"

# 5. Reiniciar
systemctl restart mediamtx
echo "--- SUCESSO: AUDIO AAC CONFIGURADO ---"
'@

# Converte para formato Linux (LF)
$linuxScript = $remoteScript.Replace("`r`n", "`n")

Write-Host "[2/2] Enviando e executando na VPS..." -ForegroundColor Yellow
Write-Host "Se o terminal pedir a senha, cole: $VPS_PASS" -ForegroundColor Green

# Método ultra-robusto: Passa o script inteiro via STDIN para o bash remoto
$linuxScript | ssh -t ${VPS_USER}@${VPS_IP} "bash"

Write-Host ""
Write-Host "Processo Concluído!" -ForegroundColor Cyan
