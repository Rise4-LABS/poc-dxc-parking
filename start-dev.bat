@echo off
echo.
echo  DXC Parking — Demarrage des serveurs de developpement
echo  ======================================================
echo.
echo  Ouverture de 2 fenetres :
echo    - Mock API  : http://localhost:3000
echo    - App React : http://localhost:5174
echo.

start "DXC Mock API (port 3000)" cmd /k "cd /d "%~dp0" && node mock-server.js"
timeout /t 2 /nobreak >nul
start "DXC Parking Dev (port 5174)" cmd /k "cd /d "%~dp0" && node node_modules\vite\bin\vite.js apps\web --port 5174 --host"

echo  Les serveurs demarrent...
echo  Ouvre http://localhost:5174 dans ton navigateur.
echo.
echo  Comptes de test :
echo    AVI    / 0000  -^>  Admin (4 onglets)
echo    USR001 / 1234  -^>  Utilisateur
echo    USR002 / 5678  -^>  Utilisateur
echo.
pause
