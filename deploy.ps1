<#
.SYNOPSIS
Windows 환경(Host PC)을 위한 자동 배포 스크립트입니다.
목적: Docker Hub에서 미리 빌드된 이미지를 다운로드하여 실행 (빠름)
#>

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "🚀 EnglishYoutube 배포 시작 (Docker Hub 이미지 사용)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 1. Docker 설치 여부 확인
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker가 설치되어 있지 않거나 실행 중이 아닙니다." -ForegroundColor Red
    Write-Host "Windows에서는 Docker Desktop을 직접 설치하셔야 합니다." -ForegroundColor Yellow
    Write-Host "다운로드 링크: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "설치 및 실행 완료 후 이 스크립트를 다시 실행해주세요." -ForegroundColor Yellow
    Pause
    exit
} else {
    Write-Host "✅ Docker가 설치되어 있습니다." -ForegroundColor Green
}

# Docker 데몬 동작 상태 확인
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker 데몬이 응답하지 않습니다. Docker Desktop이 실행 중인지 확인해주세요." -ForegroundColor Red
        Pause
        exit
    }
} catch {
    Write-Host "❌ Docker 상태를 확인할 수 없습니다." -ForegroundColor Red
    Pause
    exit
}

Write-Host ""
Write-Host "🌐 Docker Hub에서 이미지를 가져와 배포합니다..." -ForegroundColor Cyan
docker compose -f docker-compose.hub.yml up -d

Write-Host ""
Write-Host "🎉 모든 작업이 완료되었습니다!" -ForegroundColor Green
Write-Host "👉 브라우저에서 http://localhost 로 접속해 보세요." -ForegroundColor Green
Pause
