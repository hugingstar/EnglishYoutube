@echo off
chcp 65001 >nul
echo ===========================================
echo 🚀 Windows 배포 스크립트(deploy.ps1)를 실행합니다...
echo ===========================================

:: 현재 경로에 있는 deploy.ps1 파일을 PowerShell로 실행 (인자 전달)
powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
