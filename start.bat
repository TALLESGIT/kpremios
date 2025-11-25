@echo off
echo ========================================
echo   ZK Premios - Iniciando Projeto
echo ========================================
echo.

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale Node.js de https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo.

REM Verificar se .env existe
if not exist .env (
    echo [AVISO] Arquivo .env nao encontrado!
    echo Criando arquivo .env de exemplo...
    copy .env.example .env >nul 2>&1
    echo.
    echo [IMPORTANTE] Configure o arquivo .env com suas credenciais do Supabase!
    echo Pressione qualquer tecla para continuar ou Ctrl+C para cancelar...
    pause >nul
)

echo [OK] Arquivo .env encontrado
echo.

REM Verificar se node_modules existe
if not exist node_modules (
    echo [INFO] Instalando dependencias...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas
    echo.
)

echo ========================================
echo   Iniciando servidor de desenvolvimento
echo ========================================
echo.
echo Acesse: http://localhost:5173
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

REM Iniciar o servidor
call npm run dev

pause

