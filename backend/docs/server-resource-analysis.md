# 서버 리소스 분석 및 개선 방안

## 원래 문제 원인 분석

### 1. 메모리 부족 (OOM - Out of Memory)

**원인:**
- **인스턴스 사양**: t3.medium (2 vCPU, 4GB RAM)
- **메모리 사용 구성**:
  - NestJS 애플리케이션: ~350-500MB
  - PostgreSQL: ~50-100MB
  - Redis: ~20-50MB
  - FFmpeg 프로세스들: 각각 50-200MB (RTSP 스트림 처리 시)
  - 시스템 및 기타: ~500MB
  - **총 예상 사용량**: 1-1.5GB (정상), 피크 시 2-3GB+
  
- **문제점**:
  - Swap이 없음 (0B) - 메모리 부족 시 즉시 OOM 발생
  - Docker 컨테이너에 메모리 제한이 없음
  - FFmpeg 프로세스가 동시에 여러 개 실행될 경우 메모리 급증
  - 비디오 스트리밍 시 버퍼링으로 인한 메모리 사용 증가

### 2. 로그 분석 결과

**Docker 로그에서 확인된 문제:**
- Health check timeout이 반복적으로 발생 (11월 27일 15:14 ~ 19:46)
- 컨테이너들이 정상 종료되지 못하고 강제 종료됨
- 11월 27일 19:46에 서버가 완전히 종료됨 (`daemonShuttingDown=true`)

**증상:**
- 컨테이너가 응답하지 않음 (health check 실패)
- 프로세스가 종료되지 않아 강제 kill 필요
- 메모리 부족으로 인한 시스템 불안정

### 3. 리소스 집약적 작업

**메모리를 많이 사용하는 작업:**
1. **FFmpeg RTSP 스트림 처리** (`camera.service.ts`)
   - 실시간 비디오 스트리밍 (MJPEG 변환)
   - 스냅샷 캡처
   - 각 스트림마다 별도 프로세스 실행

2. **이미지 처리** (`sharp` 라이브러리)
   - 이미지 리사이징 및 변환

3. **BullMQ 워커 프로세스**
   - 센서 데이터 처리
   - 리포트 생성
   - 시계열 집계

4. **WebSocket 연결**
   - 실시간 통신을 위한 메모리 버퍼

## 현재 상태 분석

### 현재 인스턴스 상태
- **메모리**: 3.7GB 총, 1.8GB 사용, 2.0GB 사용 가능
- **CPU**: 2 vCPU
- **디스크**: 19GB 중 6GB 사용 (33%)
- **Swap**: 없음 (0B)

### Docker 컨테이너 메모리 사용량
- `hanibi-backend`: 464.6MB (12.11%)
- `hanibi-postgres`: 54.36MB (1.42%)
- `hanibi-redis`: 16.07MB (0.42%)

### 문제점
- Docker 컨테이너에 메모리 제한이 없음 (`Memory: 0`)
- Swap이 없어서 메모리 부족 시 즉시 OOM 발생 가능
- FFmpeg 프로세스가 동시에 여러 개 실행될 경우 메모리 급증 위험

## 개선 방안

### 1. 즉시 적용 가능한 개선사항

#### A. Docker 컨테이너 메모리 제한 설정

`docker-compose.yml`에 메모리 제한 추가:

```yaml
services:
  app:
    # ... 기존 설정 ...
    deploy:
      resources:
        limits:
          memory: 1.5G
        reservations:
          memory: 512M
    # 또는 간단하게
    mem_limit: 1.5g
    mem_reservation: 512m

  postgres:
    # ... 기존 설정 ...
    mem_limit: 512m
    mem_reservation: 256m

  redis:
    # ... 기존 설정 ...
    mem_limit: 256m
    mem_reservation: 128m
```

#### B. Swap 메모리 추가

```bash
# 2GB Swap 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 활성화
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### C. FFmpeg 프로세스 제한

`camera.service.ts`에서 동시 실행되는 FFmpeg 프로세스 수 제한:

```typescript
// 최대 동시 스트림 수 제한
private readonly maxConcurrentStreams = 3;
private activeStreams = new Map<string, any>();

async streamMJPEG(deviceId: string, res: Response): Promise<void> {
  if (this.activeStreams.size >= this.maxConcurrentStreams) {
    throw new BadRequestException('최대 동시 스트림 수를 초과했습니다.');
  }
  // ... 기존 코드 ...
}
```

### 2. 중기 개선사항

#### A. 인스턴스 사양 업그레이드

- **현재**: t3.medium (2 vCPU, 4GB RAM) 또는 유사
- **권장**: t3.large (2 vCPU, 8GB RAM) 이상
- **이유**: 
  - 메모리 여유 확보
  - FFmpeg 프로세스 동시 실행 여유
  - 피크 시간대 대응

#### B. 모니터링 및 알림 설정

- CloudWatch를 통한 메모리 사용량 모니터링
- 메모리 사용률 80% 이상 시 알림
- OOM 이벤트 감지 및 알림

#### C. 리소스 최적화

1. **이미지 최적화**
   - 스냅샷 이미지 자동 압축
   - 오래된 스냅샷 자동 삭제

2. **데이터베이스 최적화**
   - 인덱스 최적화
   - 오래된 로그 데이터 정리

3. **Redis 메모리 제한**
   ```yaml
   redis:
     command: redis-server --maxmemory 200mb --maxmemory-policy allkeys-lru
   ```

### 3. 장기 개선사항

#### A. 아키텍처 개선

1. **FFmpeg 프로세스 분리**
   - 별도 마이크로서비스로 분리
   - 더 큰 인스턴스에서 실행

2. **로드 밸런싱**
   - 여러 인스턴스에 부하 분산
   - Auto Scaling 그룹 구성

3. **캐싱 전략**
   - CDN을 통한 이미지 서빙
   - Redis 캐싱 최적화

#### B. 컨테이너 오케스트레이션

- Kubernetes 또는 ECS로 마이그레이션
- 자동 스케일링 및 리소스 관리

## 현재 인스턴스 유형 변경 후 예상 안정성

### 긍정적 요소
- 메모리 여유가 증가함 (현재 2GB 사용 가능)
- 컨테이너들이 정상 실행 중

### 여전히 남아있는 위험 요소
1. **메모리 제한 없음**: 컨테이너가 무제한으로 메모리 사용 가능
2. **Swap 없음**: 메모리 부족 시 즉시 OOM 발생
3. **FFmpeg 프로세스 제한 없음**: 동시 스트림이 많을 경우 메모리 급증
4. **모니터링 부족**: 메모리 사용량 추적 어려움

### 권장 조치
1. ✅ **즉시 적용**: Docker 메모리 제한 설정
2. ✅ **즉시 적용**: Swap 메모리 추가
3. ⚠️ **단기 적용**: FFmpeg 프로세스 제한
4. 📊 **중기 적용**: 모니터링 설정

## 결론

원래 서버가 종료된 주요 원인은 **메모리 부족(OOM)**이었습니다. t3.medium (4GB RAM)에서 여러 서비스와 FFmpeg 프로세스가 동시에 실행되면서 메모리 한계에 도달했고, Swap이 없어서 즉시 OOM이 발생했습니다.

현재 인스턴스 유형을 변경하여 메모리가 증가했지만, 여전히 메모리 제한 설정과 Swap 추가가 필요합니다. 특히 FFmpeg 프로세스가 동시에 여러 개 실행될 경우를 대비해야 합니다.




