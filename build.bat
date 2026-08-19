@echo off
chcp 65001 >nul
echo ===========================================
echo 🚀 EnglishYoutube Windows 자동 배포 스크립트 시작
echo ===========================================
echo.
echo [안내] 이 스크립트는 도커 허브에 올리기 전, 로컬에서 임시로 구워볼 때 쓰는 빌드용입니다.
echo 현재 단계(도커 허브 배포 완료)에서는 deploy.bat 을 사용하는 것을 권장합니다.
echo.

:: 1. Docker 설치 여부 확인
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [경고] Docker가 설치되어 있지 않습니다.
    echo Windows에서는 Docker Desktop을 직접 설치하셔야 합니다.
    echo 설치 페이지로 이동합니다...
    start https://www.docker.com/products/docker-desktop/
    echo 설치 및 실행 완료 후 이 스크립트를 다시 실행해주세요.
    pause
    exit /b
)

echo [완료] Docker가 설치되어 있습니다.
echo.

:: Docker 데몬 동작 상태 확인
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [오류] Docker 데몬이 응답하지 않습니다. Docker Desktop 앱이 켜져 있는지 확인해주세요.
    pause
    exit /b
)

echo.
echo 🔨 소스코드를 직접 빌드하여 서버를 띄웁니다...
docker compose up -d --build
echo.
echo 🎉 모든 작업이 완료되었습니다!
echo 👉 브라우저에서 http://localhost 로 접속해 보세요.
pause
