# 리소스 제한 설정 요약

## 적용된 제한 사항

### 1. ✅ Docker 컨테이너 메모리 제한
**파일**: `docker-compose.yml`

```yaml
app:
  mem_limit: 1.5g      # 최대 1.5GB
  mem_reservation: 512m  # 최소 512MB 보장

postgres:
  mem_limit: 512m       # 최대 512MB
  mem_reservation: 256m  # 최소 256MB 보장

redis:
  mem_limit: 256m       # 최대 256MB
  mem_reservation: 128m  # 최소 128MB 보장
  command: redis-server --maxmemory 200mb --maxmemory-policy allkeys-lru
```

**효과**: 각 컨테이너가 무제한으로 메모리를 사용하는 것을 방지

### 2. ✅ FFmpeg 동시 실행 수 제한
**파일**: `src/realtime/gateways/camera-stream.gateway.ts`

```typescript
private readonly MAX_CONCURRENT_STREAMS = 5;
```

**효과**: 
- 최대 5개의 동시 스트림만 허용
- FFmpeg 프로세스가 무제한 생성되는 것을 방지
- 메모리 사용량 예측 가능

### 3. ✅ 데이터베이스 연결 풀 제한
**파일**: `src/database/typeorm.config.ts`

```typescript
extra: {
  max: 10,              // 최대 연결 수
  min: 2,              // 최소 연결 수
  maxQueryExecutionTime: 5000, // 쿼리 타임아웃 5초
}
```

**효과**:
- 데이터베이스 연결 수 제한
- 장시간 실행되는 쿼리 자동 종료
- 메모리 사용량 제어

### 4. ⚠️ Swap 메모리 추가 (수동 실행 필요)
**스크립트**: `scripts/setup-swap.sh`

```bash
sudo ./scripts/setup-swap.sh 2G
```

**효과**: 메모리 부족 시 Swap 사용으로 OOM 방지

## 예상 메모리 사용량

### 정상 운영 시
```
기본 서비스: 1.8GB
+ FFmpeg 2-3개: +300-600MB
+ 여유 공간: +500MB
─────────────────────
총 사용량: ~2.6-2.9GB (안전)
```

### 피크 시간대 (제한 적용 후)
```
기본 서비스: 1.8GB
+ FFmpeg 최대 5개: +500MB-1GB
+ 이미지 처리: +200-400MB
+ DB 쿼리: +100-200MB
+ 시스템: +300MB
─────────────────────
총 사용량: 2.9-3.7GB (안전)
```

## 다음 단계

### 즉시 실행
1. Swap 메모리 추가:
   ```bash
   cd /home/ubuntu/Hanibi/backend
   sudo ./scripts/setup-swap.sh 2G
   ```

2. Docker 컨테이너 재시작 (제한 적용):
   ```bash
   docker compose down
   docker compose up -d
   ```

### 모니터링 권장
- CloudWatch를 통한 메모리 사용량 모니터링
- 메모리 사용률 80% 이상 시 알림 설정



