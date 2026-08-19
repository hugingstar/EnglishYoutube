#!/bin/bash
# build.sh - 자동 배포 스크립트 (Rocky Linux / CentOS / RHEL 호환)

echo "==========================================="
echo "🚀 EnglishYoutube 자동 배포 스크립트 시작"
echo "==========================================="
echo "💡 참고: 이 스크립트는 도커 허브를 거치지 않고 리눅스 서버 그 자체에서 코드를 무겁게 직접 구워야 하는"
echo "'비상 상황(또는 특수 목적)'일 때만 씁니다. 도커 허브에 올려둔 상태라면 ./deploy.sh를 사용하세요."

# 1. Docker 설치 여부 확인 및 설치 (Rocky Linux 기준)
if ! command -v docker &> /dev/null; then
    echo "📦 Docker가 설치되어 있지 않습니다. Docker를 설치합니다..."
    sudo dnf install -y dnf-utils
    sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    echo "🔧 Docker 서비스를 시작하고 자동 실행을 활성화합니다..."
    sudo systemctl enable --now docker
    
    # 현재 사용자를 docker 그룹에 추가 (권한 부여)
    sudo usermod -aG docker $USER
    echo "✅ Docker 설치가 완료되었습니다."
else
    echo "✅ Docker가 이미 설치되어 있습니다."
fi

# 2. 방화벽 설정 (포트 80 개방)
echo ""
echo "🛡️ 방화벽 설정을 확인합니다..."
if systemctl is-active --quiet firewalld; then
    echo "방화벽(firewalld)이 동작 중입니다. 80번 포트를 자동으로 개방합니다."
    sudo firewall-cmd --zone=public --add-port=80/tcp --permanent
    sudo firewall-cmd --reload
    echo "✅ 80번 포트 개방 완료."
else
    echo "방화벽(firewalld)이 비활성화되어 있거나 설치되지 않았습니다. 포트 개방을 건너뜁니다."
fi

echo ""
echo "🔨 소스코드를 직접 빌드하여 서버를 시작합니다..."
sudo docker compose up -d --build

echo ""
echo "🎉 모든 빌드 및 실행 작업이 완료되었습니다!"
echo "👉 브라우저에서 서버의 IP(포트 80)로 접속해 보세요."
