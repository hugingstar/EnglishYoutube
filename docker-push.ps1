Write-Host "Docker Hub에 푸시하기 위해 로그인이 필요할 수 있습니다."
docker login

Write-Host "`n[1/2] 도커 이미지 빌드 시작..."
docker build -t yslee4050/talkchamsae:latest .
if ($LASTEXITCODE -ne 0) { Write-Error "빌드 실패"; exit 1 }

Write-Host "`n[2/2] 도커 이미지 푸시 시작..."
docker push yslee4050/talkchamsae:latest
if ($LASTEXITCODE -ne 0) { Write-Error "푸시 실패"; exit 1 }

Write-Host "`n모든 작업이 성공적으로 완료되었습니다!"
