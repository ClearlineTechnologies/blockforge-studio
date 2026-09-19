@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0runtime;%PATH%"
"%~dp0runtime\node.exe" "%~dp0runtime\npm\bin\npm-cli.js" run build
if errorlevel 1 goto failed
"%~dp0runtime\node.exe" scripts\build-launcher.mjs
if errorlevel 1 goto failed
echo BlockForge rebuilt successfully.
pause
exit /b 0
:failed
echo Build failed. Review the output above.
pause
exit /b 1
