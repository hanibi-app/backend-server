# 디바이스 명령 전송 흐름 및 현재 상태

## 현재 구현 상태

### ✅ 구현된 부분

1. **명령 생성 및 저장**
   - `POST /api/v1/devices/{deviceId}/commands` - 사용자가 명령 전송
   - 명령이 `device_commands` 테이블에 저장됨
   - 상태: `PENDING` → 큐에 추가

2. **큐 처리**
   - `DeviceControlProcessor`가 큐에서 명령을 처리
   - 상태: `PENDING` → `SENT`
   - 서버 내부 상태 업데이트 (device.deviceStatus, device.deviceConfig)

3. **명령 조회 API**
   - `GET /api/v1/devices/{deviceId}/commands/pending` - 대기 중인 명령 조회
   - `GET /api/v1/devices/{deviceId}/commands` - 명령 이력 조회

4. **명령 확인 (ACK)**
   - `PATCH /api/v1/devices/{deviceId}/commands/{commandId}/ack` - 디바이스가 명령 처리 완료 응답
   - 상태: `SENT` → `ACKED` 또는 `FAILED`

### ❌ 구현되지 않은 부분

1. **실제 하드웨어 통신**
   - 서버에서 하드웨어로 직접 명령을 푸시하는 로직이 없음
   - MQTT, WebSocket, HTTP 푸시 등이 구현되지 않음
   - 현재는 **폴링 방식**만 지원 (하드웨어가 주기적으로 명령을 가져옴)

2. **실제 하드웨어 제어**
   - `DeviceControlProcessor`는 서버 내부 상태만 업데이트
   - 실제 하드웨어(아두이노 등)에 명령을 전송하지 않음

## 동작 흐름

### 현재 구현된 흐름

```
1. 사용자 → POST /api/v1/devices/{deviceId}/commands
   ↓
2. 서버: 명령을 DB에 저장 (status: PENDING)
   ↓
3. 서버: 명령을 큐에 추가
   ↓
4. DeviceControlProcessor: 큐에서 명령 처리
   - status: PENDING → SENT
   - 서버 내부 상태 업데이트 (device.deviceStatus 등)
   ↓
5. 하드웨어: GET /api/v1/devices/{deviceId}/commands/pending
   - 주기적으로 폴링하여 대기 중인 명령 가져옴
   ↓
6. 하드웨어: 명령 처리
   ↓
7. 하드웨어: PATCH /api/v1/devices/{deviceId}/commands/{commandId}/ack
   - status: SENT → ACKED
```

### 실제 하드웨어 통신이 필요한 흐름 (미구현)

```
1. 사용자 → POST /api/v1/devices/{deviceId}/commands
   ↓
2. 서버: 명령을 DB에 저장 및 큐에 추가
   ↓
3. 서버: 하드웨어로 직접 명령 전송 (MQTT/WebSocket/HTTP)
   - 현재 이 부분이 없음!
   ↓
4. 하드웨어: 명령 수신 및 처리
   ↓
5. 하드웨어: ACK 응답
```

## 사용자가 디바이스에 명령을 보낸다는 것의 의미

### 현재 상태

**사용자가 할 수 있는 것:**
- 앱/웹에서 "처리 시작", "온도 설정" 등의 명령을 보냄
- 명령이 서버에 저장되고 큐에 추가됨
- 서버 내부 상태가 업데이트됨

**하지만:**
- 실제 하드웨어로 명령이 전송되지 않음
- 하드웨어는 주기적으로 폴링해서 명령을 가져와야 함
- 서버에서 하드웨어로 푸시하는 로직이 없음

### 예시: 온도 설정 명령

```typescript
// 1. 사용자가 앱에서 온도 설정
POST /api/v1/devices/ETCOM-001/commands
{
  "commandType": "SET_TEMPERATURE",
  "temperature": 25
}

// 2. 서버 응답
{
  "success": true,
  "data": {
    "id": "command-uuid-123",
    "commandType": "SET_TEMPERATURE",
    "status": "PENDING",
    "payload": { "temperature": 25 }
  }
}

// 3. 서버 내부 처리
// - DeviceControlProcessor가 큐에서 처리
// - device.deviceConfig.targetTemperature = 25로 업데이트
// - status: PENDING → SENT

// 4. 하드웨어가 명령 가져오기 (폴링)
GET /api/v1/devices/ETCOM-001/commands/pending
// 응답: 위의 명령이 반환됨

// 5. 하드웨어가 명령 처리 후 ACK
PATCH /api/v1/devices/ETCOM-001/commands/command-uuid-123/ack
// status: SENT → ACKED
```

## 지원하는 명령 타입

```typescript
enum DeviceCommandType {
  Start = 'START',              // 처리 시작
  Stop = 'STOP',                // 처리 중지
  Pause = 'PAUSE',              // 일시 정지
  Resume = 'RESUME',            // 재개
  SetTemperature = 'SET_TEMPERATURE',  // 온도 설정
  UpdateInterval = 'UPDATE_INTERVAL',  // 데이터 전송 간격 설정
}
```

## 결론

### 현재 상태
- ✅ 백엔드 로직은 완성되어 있음
- ✅ 명령 생성, 저장, 조회, ACK 모두 작동함
- ❌ 실제 하드웨어로 푸시하는 로직은 없음
- ⚠️ 하드웨어는 폴링 방식으로 명령을 가져와야 함

### 필요한 작업
1. **하드웨어 측**: 주기적으로 `/commands/pending` API를 호출하여 명령 가져오기
2. **향후 개선**: MQTT/WebSocket을 통한 실시간 푸시 구현 (remaining_tasks.md에 TODO로 남아있음)

### 작동 여부
- **서버 측**: ✅ 정상 작동
- **하드웨어 통신**: ⚠️ 폴링 방식으로만 가능 (푸시는 미구현)



