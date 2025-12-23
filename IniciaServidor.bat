:: Arquivo BAT
@echo off

:: ================================
:: CONFIGURACOES
:: ================================
set "RAIZ=C:\Verde Perto Ambiental"
set "REPO=%RAIZ%\whatsapp"

cd /d "%REPO%" || goto erro

echo.
echo ===========================
echo    Iniciando projeto...
echo ===========================
echo.
echo.
echo ===================================
echo   ATENCAO ATENCAO ATENCAO ATENCAO
echo ===================================
echo -> ATENCAO: EVITE fechar esta janela pelo X da janela. 
echo -> UTILIZE CTRL+C e depois aperte S
::echo Iniciando projeto...
npm start

