@echo off
REM Script de déploiement Windows pour hublib.ovh
REM Note: Ces scripts sont principalement pour Linux. Sur Windows, utilisez WSL ou PowerShell.

echo Ce script doit être exécuté sur un serveur Linux.
echo Sur Windows, utilisez WSL ou exécutez les commandes manuellement.
echo.
echo Commandes à exécuter sur le serveur:
echo   docker-compose -f docker-compose.prod.yml build
echo   docker-compose -f docker-compose.prod.yml up -d

pause

