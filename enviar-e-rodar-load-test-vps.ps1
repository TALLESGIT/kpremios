# Envia arquivos do load test para a VPS e roda o teste NA VPS (contra localhost).
# Assim o limite e so o servidor (Node), nao o seu PC.
#
# Execute: .\enviar-e-rodar-load-test-vps.ps1 [STREAM_ID]
# Ex.:    .\enviar-e-rodar-load-test-vps.ps1
#         .\enviar-e-rodar-load-test-vps.ps1 b816b205-65e0-418e-8205-c3d56edd76c7

param(
    [string]$STREAM_ID = "b816b205-65e0-418e-8205-c3d56edd76c7"
)

$VPS_IP = "76.13.82.48"
$VPS_USER = "root"
$REMOTE_DIR = "/var/www/zkpremios-backend"
# Usar pasta do script como raiz do projeto (funciona de qualquer diretorio)
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$LOCAL_BACKEND = Join-Path $ScriptRoot "backend\socket-server"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ENVIAR LOAD TEST E RODAR NA VPS (localhost)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Stream ID: $STREAM_ID" -ForegroundColor Gray
Write-Host ""

# Converter .sh para LF (Unix) antes de enviar, senao da "required file not found" na VPS
$shPath = "$LOCAL_BACKEND\run-load-test-na-vps.sh"
if (Test-Path $shPath) {
    $content = [System.IO.File]::ReadAllText($shPath) -replace "`r`n", "`n" -replace "`r", "`n"
    [System.IO.File]::WriteAllText($shPath, $content, [System.Text.UTF8Encoding]::new($false))
}

$files = @(
    "$LOCAL_BACKEND\load-test.js",
    "$LOCAL_BACKEND\load-test-distributed.js",
    "$LOCAL_BACKEND\run-load-test-na-vps.sh",
    "$LOCAL_BACKEND\load-test-users.json"
)

foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Host "[ERRO] Arquivo nao encontrado: $f" -ForegroundColor Red
        Write-Host "Crie load-test-users.json com: cd backend/socket-server; npm run create-load-test-users" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "[INFO] Enviando arquivos para a VPS..." -ForegroundColor Yellow
foreach ($f in $files) {
    $leaf = Split-Path $f -Leaf
    scp $f "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/$leaf"
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERRO] Falha ao enviar $leaf" -ForegroundColor Red; exit 1 }
    Write-Host "  OK $leaf" -ForegroundColor Green
}

Write-Host ""
Write-Host "[INFO] Executando load test NA VPS (1500 clientes, localhost:3001)..." -ForegroundColor Yellow
Write-Host ""

# Rodar load test NA VPS (bash le o script; arquivo ja em LF pelo passo acima)
ssh "${VPS_USER}@${VPS_IP}" "cd $REMOTE_DIR; bash run-load-test-na-vps.sh $STREAM_ID"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fim. Some 'Conectados' e 'Entraram na sala' no RESULTADO acima." -ForegroundColor Gray
Write-Host "Se der ~1500, o servidor aguenta 1500 conexoes." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
