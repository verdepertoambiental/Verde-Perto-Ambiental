@echo off
::setlocal

title Atualizador ECOCOLETA

:: ================================
:: CONFIGURACOES
:: ================================
set "RAIZ=C:\Verde Perto Ambiental"
set "REPO=%RAIZ%\whatsapp"
set "GITHUB=https://github.com/verdepertoambiental/whatsapp.git"
::set KEY=%RAIZ%\keys\deploy_key
::set REPO_SSH=git@github.com:verdepertoambiental/whatsapp.git

echo ================================
echo  ATUALIZADOR ECOCOLETA
echo ================================
echo.

:: ================================
:: FINALIZA NODE SE ESTIVER RODANDO
:: ================================
echo Finalizando processos Node...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1

::set "GIT_SSH_COMMAND=ssh -i "%KEY%" -o StrictHostKeyChecking=no"

:: ================================
:: GARANTE PASTA BASE
:: ================================
if not exist "%RAIZ%" (
    echo Criando pasta base...
    mkdir "%RAIZ%"
)

cd /d "%RAIZ%" || goto erro



:: ================================
:: CLONE OU UPDATE
:: ================================
if not exist "%REPO%\.git" (
    echo.
    echo Clonando repositorio pela primeira vez...
    ::git clone "%REPO_SSH%" "%REPO%"
	git clone "%GITHUB%"
    if errorlevel 1 goto erro
) else (
    echo.
    echo Atualizando repositorio...
    pushd "%REPO%" || goto erro
    git pull
    if errorlevel 1 goto erro
    popd
)

:: ================================
:: DEPENDENCIAS NODE
:: ================================
pushd "%REPO%" || goto erro

if exist "package.json" (
    echo.
    echo Instalando / verificando dependencias Node...
    npm install --no-audit --no-fund
    if errorlevel 1 goto erro
)

popd

echo.
echo ================================
echo ATUALIZACAO CONCLUIDA COM SUCESSO
echo ================================
echo.
pause
exit /b 0

:: ================================
:: TRATAMENTO DE ERRO
:: ================================
:erro
echo.
echo ================================
echo ERRO NA ATUALIZACAO DO SISTEMA
echo ================================
echo.
pause
exit /b 1
