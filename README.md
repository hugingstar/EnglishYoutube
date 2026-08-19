# 톡참새 (EnglishYoutube)

**톡참새(EnglishYoutube)**는 [Next.js](https://nextjs.org)를 기반으로 만들어진 원어민 일상 유튜브 영상 큐레이션 서비스입니다.
복잡한 환경 설정 없이, 스크립트 실행 한 번으로 로컬(내 PC) 테스트부터 실제 운영 서버 배포까지 완벽하게 자동화되어 초보자도 쉽게 다룰 수 있습니다.

---

## 🏗️ 시스템 아키텍처

서비스가 어떻게 동작하고 배포되는지 보여주는 전체 구조도입니다.

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '18px', 'fontFamily': 'sans-serif'}}}%%
flowchart TD
    subgraph Developer["개발 환경 (Windows)"]
        Code["💻 애플리케이션 개발"]
        Code --> BuildBat["🛠️ 로컬 빌드 및 테스트<br/>(build.bat)"]
        Code --> PushPS["🚀 클라우드 저장소 업로드<br/>(docker-push.ps1)"]
    end

    Hub[("🐳 중앙 이미지 저장소<br/>(Docker Hub)")]
    PushPS == "이미지 Push" ==> Hub

    subgraph Server["운영 컨테이너 환경 (Linux / Windows)"]
        Deploy["⚡ 자동 배포 스크립트<br/>(deploy.sh / deploy.bat)"]
        Nginx["Nginx<br/>(리버스 프록시)"]
        NextJS["Next.js<br/>(웹 애플리케이션)"]
        
        Deploy -.->|최신 이미지 Pull| Nginx
        Nginx -.->|내부망 안전 라우팅| NextJS
    end

    Hub == "이미지 다운로드" ==> Deploy
```

---

## 🗂️ 데이터 구조 (ER Diagram)

현재 서비스에서 관리하는 주요 정적 데이터(Curation)와 외부 유튜브 API와의 관계도입니다.

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '18px', 'fontFamily': 'sans-serif'}}}%%
erDiagram
    USER ||--o{ VIDEO_META : "영상 선택 및 시청"
    VIDEO_META ||--|| YOUTUBE_API : "자막 및 메타데이터 실시간 연동"

    VIDEO_META {
        string id PK "고유 ID"
        string youtubeId "유튜브 고유 식별자"
        string sourceLang "원본 언어"
        string language "자막 언어 (en-US, ja 등)"
        string topic "영상 카테고리/주제"
        string reason "큐레이션 이유"
    }

    YOUTUBE_API {
        string captions "실시간 공식 자막"
        string videoData "영상 재생 정보"
    }
```

---

## 🚀 배포 가이드 (시작하기)

이 프로젝트는 도커(Docker) 기반으로 동작하므로, 아래 스크립트 중 본인의 상황에 맞는 **단 하나**만 실행하면 됩니다!

### 1. 내 컴퓨터에서 수정하고 테스트할 때 (개발용)
코드를 수정하고 내 PC에서 확인하고 싶을 때 사용합니다.
- **Windows:** `build.bat` (또는 `build.ps1`) 실행

### 2. 수정된 버전을 도커 허브(클라우드)에 올릴 때
내 PC에서 테스트가 완료된 완벽한 버전을 출시할 때 딱 1번 사용합니다.
- **Windows:** `docker-push.ps1` 실행

### 3. 실제 운영 서버에 최신 버전을 배포할 때 (실서버용)
도커 허브에 올라간 최신 버전을 다운로드 받아 서비스할 때 사용합니다. 빌드 과정이 생략되어 1초 만에 초고속 배포가 가능합니다.
- **Windows 환경:** `deploy.bat` 실행
- **Linux 환경:** `./deploy.sh` 실행

> **보안 안내:** Next.js 애플리케이션은 외부에 직접 포트를 열지 않고, 오직 Nginx를 통해서만 안전하게 접속되도록 내부망이 격리되어 있습니다. 포트 80을 통한 안전한 트래픽만 허용됩니다.
