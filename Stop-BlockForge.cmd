@echo off
cd /d "%~dp0"
"%~dp0runtime\node.exe" scripts\stop.mjs
pause
