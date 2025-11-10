# Hanibi - 음식물 처리기 IoT 백엔드

음식물 처리기 하드웨어와 연동되는 백엔드 API 서버입니다.

## 주요 기능

- 📊 **센서 데이터 수집**: 온도, 습도, 무게, 가스 센서 데이터 실시간 수집
- 🤖 **캐릭터 시스템**: 센서 데이터 기반 캐릭터 상태 변화
- 📝 **요청 로깅**: 모든 센서 API 요청 기록 및 디버깅
- 🔒 **Rate Limiting**: 디바이스별 요청 제한
- 🎯 **실시간 알림**: WebSocket 기반 실시간 업데이트
- 📈 **에코 스코어**: 환경 기여도 점수 계산 및 랭킹

## 기술 스택

- **Framework**: NestJS (Node.js 20+)
- **Database**: PostgreSQL 14
- **Cache/Queue**: Redis 7, BullMQ
- **Real-time**: Socket.io
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker, Docker Compose

## 시작하기

### 사전 요구사항

- Docker & Docker Compose
- Node.js 20+ (로컬 개발 시)

### 로컬 개발 환경

```bash
# 1. 저장소 클론
git clone https://github.com/DDuckyee/Hanibi.git
cd Hanibi/backend

# 2. 환경 변수 설정
cp env/.env.example env/docker.env
# env/docker.env 파일을 수정하여 필요한 값 설정

# 3. Docker Compose로 실행
docker compose up -d

# 4. 로그 확인
docker compose logs -f app

# 5. API 문서 접속
open http://localhost:3000/docs
```

### 환경 변수 설정

`env/docker.env` 파일에서 다음 값들을 설정하세요:

- `DB_PASSWORD`: 데이터베이스 비밀번호
- `JWT_ACCESS_TOKEN_SECRET`: JWT Access Token 시크릿
- `JWT_REFRESH_TOKEN_SECRET`: JWT Refresh Token 시크릿
- `CORS_ORIGINS`: 허용할 CORS 오리진

## API 문서

서버 실행 후 다음 URL에서 Swagger UI를 통해 API 문서를 확인할 수 있습니다:

```
http://localhost:3000/docs
```

## 주요 엔드포인트

### 센서 데이터
- `POST /api/v1/sensors/data` - 센서 데이터 전송
- `POST /api/v1/sensors/heartbeat` - 하트비트
- `POST /api/v1/sensors/events` - 센서 이벤트
- `GET /api/v1/sensors/request-logs` - 요청 로그 조회

### 인증
- `POST /api/v1/auth/signup` - 회원가입
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/refresh` - 토큰 갱신

### 디바이스
- `GET /api/v1/devices` - 디바이스 목록
- `POST /api/v1/devices/pair` - 디바이스 페어링

## AWS 배포

### EC2 인스턴스 사양

- **개발/테스트**: t3.medium (2 vCPU, 4GB RAM)
- **프로덕션**: t3.large 이상 권장

### 배포 방법

```bash
# 1. EC2에 Docker 설치
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# 2. Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. 저장소 클론 및 배포
git clone https://github.com/DDuckyee/Hanibi.git
cd Hanibi/backend
cp env/.env.example .env.production
# .env.production 파일 수정

docker compose -f docker-compose.yml up -d --build
```

### 보안 그룹 설정

EC2 인스턴스의 보안 그룹에서 다음 포트를 개방하세요:

- `22` (SSH): 관리용, 내 IP만 허용
- `80` (HTTP): 웹 접속용
- `3000` (API): API 서버, 필요 시 개방

## 개발

### 로컬에서 개발 모드 실행

```bash
cd backend
npm install
npm run start:dev
```

### 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

## Rate Limit

- **센서 데이터 POST**: 15분당 300개 (디바이스별)
- **일반 API**: 15분당 100개 (IP별)
- **조회 API**: 제한 없음

## 모니터링

### 요청 로그 조회

```bash
# 모든 요청 로그
curl http://localhost:3000/api/v1/sensors/request-logs

# 특정 디바이스
curl 'http://localhost:3000/api/v1/sensors/request-logs?deviceId=DEVICE-001'

# 검증 실패 요청만
curl 'http://localhost:3000/api/v1/sensors/request-logs?status=VALIDATION_FAILED'
```

### Docker 로그

```bash
# 애플리케이션 로그
docker compose logs -f app

# 데이터베이스 로그
docker compose logs -f postgres

# Redis 로그
docker compose logs -f redis
```

## 라이센스

MIT

## 문의

- Repository: https://github.com/DDuckyee/Hanibi

