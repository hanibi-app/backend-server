# commandId 설명

## `/api/v1/devices/{deviceId}/commands/{commandId}/ack` 엔드포인트

### commandId란?

`commandId`는 **디바이스 제어 명령의 고유 ID**입니다.

### 동작 흐름

1. **명령 생성** (`POST /api/v1/devices/{deviceId}/commands`)
   - 사용자가 디바이스에 명령을 보냄 (예: 온도 설정, 처리 시작 등)
   - 서버가 `DeviceCommand` 엔티티를 생성하고 고유 ID를 부여
   - 이 ID가 `commandId`입니다

2. **명령 전송**
   - 명령이 큐에 추가되어 디바이스로 전송됨
   - 상태: `PENDING` → `SENT`

3. **명령 확인 (ACK)** (`PATCH /api/v1/devices/{deviceId}/commands/{commandId}/ack`)
   - 디바이스가 명령을 받고 처리 완료 후 이 엔드포인트를 호출
   - `commandId`를 사용하여 어떤 명령인지 식별
   - 상태: `SENT` → `ACKED` 또는 `FAILED`

### 예시

```typescript
// 1. 명령 전송
POST /api/v1/devices/ETCOM-001/commands
{
  "commandType": "SET_TEMPERATURE",
  "temperature": 25
}

// 응답
{
  "success": true,
  "data": {
    "id": "abc123-def456-ghi789",  // 이것이 commandId
    "commandType": "SET_TEMPERATURE",
    "status": "PENDING",
    ...
  }
}

// 2. 디바이스가 명령 처리 완료 후 ACK
PATCH /api/v1/devices/ETCOM-001/commands/abc123-def456-ghi789/ack
{
  "status": "ACKED"
}
```

### DeviceCommand 엔티티 구조

```typescript
{
  id: string;              // commandId (UUID)
  device: Device;          // 대상 디바이스
  user: User;              // 명령을 보낸 사용자
  commandType: string;     // 명령 타입 (SET_TEMPERATURE, START_PROCESSING 등)
  payload: object;          // 명령 파라미터
  status: 'PENDING' | 'SENT' | 'ACKED' | 'FAILED';
  sentAt?: Date;
  acknowledgedAt?: Date;
}
```

### 요약

- `commandId` = 디바이스 제어 명령의 고유 식별자 (UUID)
- 명령을 보낼 때 생성되고, 디바이스가 응답할 때 이 ID로 어떤 명령인지 식별
- `/ack` 엔드포인트는 디바이스가 명령을 성공적으로 처리했는지 확인하는 용도


