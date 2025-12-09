# 백엔드-프론트엔드 통합 요구사항 분석

## 개요
프론트엔드 코드 분석 결과, 백엔드에서 추가/수정이 필요한 API 엔드포인트 및 데이터 형식 정리

---

## 1. 설정 API 엔드포인트 불일치 ⚠️ **긴급**

### 프론트엔드 기대 형식

**파일:** `/home/ubuntu/client-temp/src/services/api/settings.ts`

```typescript
// 프론트엔드가 호출하는 엔드포인트
POST /settings/display
Body: {
  displayCharacter?: boolean;
  useMonochromeDisplay?: boolean;
}

POST /settings/alerts
Body: {
  dialogueAlertsEnabled?: boolean;
  cleaningAlertsEnabled?: boolean;
  sensorAlertsEnabled?: boolean;
}
```

### 백엔드 현재 상태

**파일:** `/home/ubuntu/Hanibi/backend/src/modules/settings/settings.controller.ts`

- `PATCH /settings` - key-value 배열 형식
- `PATCH /settings/notifications` - NotificationType 기반

### 수정 방안

**옵션 1: 프론트엔드 형식에 맞춰 새 엔드포인트 추가 (권장)**

`settings.controller.ts`에 다음 엔드포인트 추가:

```typescript
@Post('display')
@ApiOperation({ summary: '디스플레이 설정 업데이트' })
async updateDisplaySettings(
  @CurrentUser() user: User,
  @Body() payload: { displayCharacter?: boolean; useMonochromeDisplay?: boolean }
) {
  const settings: UpdateUserSettingsDto['settings'] = [];
  
  if (payload.displayCharacter !== undefined) {
    settings.push({
      key: 'display.character',
      value: payload.displayCharacter ? 'true' : 'false',
    });
  }
  
  if (payload.useMonochromeDisplay !== undefined) {
    settings.push({
      key: 'display.monochrome',
      value: payload.useMonochromeDisplay ? 'true' : 'false',
    });
  }
  
  const result = await this.settingsService.updateUserSettings(user, { settings });
  return {
    success: true,
    data: result,
  };
}

@Post('alerts')
@ApiOperation({ summary: '알림 설정 업데이트' })
async updateAlertSettings(
  @CurrentUser() user: User,
  @Body() payload: {
    dialogueAlertsEnabled?: boolean;
    cleaningAlertsEnabled?: boolean;
    sensorAlertsEnabled?: boolean;
  }
) {
  const preferences: UpdateNotificationSettingsDto['preferences'] = [];
  
  if (payload.dialogueAlertsEnabled !== undefined) {
    preferences.push({
      type: NotificationType.StateAlert, // 또는 적절한 타입 매핑
      isEnabled: payload.dialogueAlertsEnabled,
    });
  }
  
  if (payload.cleaningAlertsEnabled !== undefined) {
    preferences.push({
      type: NotificationType.Cleaning,
      isEnabled: payload.cleaningAlertsEnabled,
    });
  }
  
  if (payload.sensorAlertsEnabled !== undefined) {
    preferences.push({
      type: NotificationType.StateAlert, // 센서 이상 알림
      isEnabled: payload.sensorAlertsEnabled,
    });
  }
  
  const result = await this.settingsService.updateNotificationSettings(user, { preferences });
  return {
    success: true,
    data: result,
  };
}
```

**옵션 2: 프론트엔드 수정 (비권장)**
- 프론트엔드 코드를 백엔드 형식에 맞춰 수정

---

## 2. 대시보드 API 누락 ⚠️ **긴급**

### 프론트엔드 기대 형식

**파일:** `/home/ubuntu/client-temp/src/screens/Dashboard/DashboardScreen.tsx`

```typescript
// 프론트엔드가 기대하는 엔드포인트
GET /api/dashboard

// 응답 형식
{
  healthScore: {
    total: number;        // 0-100 점수
    status: 'safe' | 'caution' | 'warning' | 'danger';
  },
  metrics: {
    temperature: number;  // °C
    humidity: number;     // %
    weight: number;       // kg
    voc: number;          // ppb (gas)
  }
}
```

### 백엔드 현재 상태

- 해당 엔드포인트 없음
- 센서 데이터는 `GET /sensors/:deviceId/latest`로 조회 가능

### 수정 방안

**새 모듈 생성 또는 기존 모듈 확장**

1. **새 파일 생성:** `src/modules/dashboard/dashboard.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'dashboard',
  version: '1',
})
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: '대시보드 데이터 조회' })
  async getDashboard(@CurrentUser() user: User) {
    const data = await this.dashboardService.getDashboardData(user);
    return {
      success: true,
      data,
    };
  }
}
```

2. **서비스 로직 구현:** `src/modules/dashboard/dashboard.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import { SensorData } from '../sensors/entities/sensor-data.entity';

export interface DashboardData {
  healthScore: {
    total: number;
    status: 'safe' | 'caution' | 'warning' | 'danger';
  };
  metrics: {
    temperature: number;
    humidity: number;
    weight: number;
    voc: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(SensorData)
    private readonly sensorDataRepository: Repository<SensorData>,
  ) {}

  async getDashboardData(user: User): Promise<DashboardData> {
    // 사용자의 첫 번째 기기 조회 (또는 기본 기기)
    const device = await this.deviceRepository.findOne({
      where: { user: { id: user.id } },
      order: { createdAt: 'ASC' },
    });

    if (!device) {
      // 기본값 반환
      return {
        healthScore: { total: 0, status: 'danger' },
        metrics: { temperature: 0, humidity: 0, weight: 0, voc: 0 },
      };
    }

    // 최신 센서 데이터 조회
    const latestData = await this.sensorDataRepository.findOne({
      where: { device: { id: device.id } },
      order: { measuredAt: 'DESC' },
    });

    const metrics = {
      temperature: Number(latestData?.temperature ?? 0),
      humidity: Number(latestData?.humidity ?? 0),
      weight: Number(latestData?.weight ?? 0) / 1000, // g -> kg 변환
      voc: Number(latestData?.gas ?? 0),
    };

    // 건강 점수 계산 로직
    const healthScore = this.calculateHealthScore(metrics);

    return {
      healthScore,
      metrics,
    };
  }

  private calculateHealthScore(metrics: {
    temperature: number;
    humidity: number;
    weight: number;
    voc: number;
  }): { total: number; status: 'safe' | 'caution' | 'warning' | 'danger' } {
    let score = 100;
    const issues: string[] = [];

    // 온도 체크 (18-30°C가 정상)
    if (metrics.temperature < 18 || metrics.temperature > 30) {
      score -= 20;
      issues.push('temperature');
    }

    // 습도 체크 (30-60%가 정상)
    if (metrics.humidity < 30 || metrics.humidity > 60) {
      score -= 20;
      issues.push('humidity');
    }

    // VOC 체크 (200ppb 미만이 정상)
    if (metrics.voc > 200) {
      score -= 30;
      issues.push('voc');
    }

    // 무게 체크 (0보다 크면 정상)
    if (metrics.weight <= 0) {
      score -= 10;
    }

    // 상태 결정
    let status: 'safe' | 'caution' | 'warning' | 'danger';
    if (score >= 75) {
      status = 'safe';
    } else if (score >= 50) {
      status = 'caution';
    } else if (score >= 25) {
      status = 'warning';
    } else {
      status = 'danger';
    }

    return { total: Math.max(0, Math.min(100, score)), status };
  }
}
```

3. **모듈 등록:** `src/modules/dashboard/dashboard.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Device } from '../devices/entities/device.entity';
import { SensorData } from '../sensors/entities/sensor-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Device, SensorData])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

4. **app.module.ts에 DashboardModule 추가**

---

## 3. 리포트 API 형식 불일치 ⚠️ **긴급**

### 프론트엔드 기대 형식

**파일:** `/home/ubuntu/client-temp/src/screens/Reports/ReportsScreen.tsx`

```typescript
// 프론트엔드가 기대하는 엔드포인트
GET /api/reports/{type}?range={range}

// 파라미터
type: 'temp' | 'humidity' | 'weight' | 'voc'
range: '1일' | '1주일' | '1개월' | '1년'

// 응답 형식
{
  dataPoints: Array<{
    time: string;        // "00:00", "06:00" 등
    value: number;
    timestamp: number;    // Unix timestamp
  }>;
  summary: {
    current: number;
    max: { value: number; time: string };
    min: { value: number; time: string };
    average: number;
    referenceDate: string; // "2025.09.08"
  };
}
```

### 백엔드 현재 상태

- `GET /reports/eco-score` - 환경경 점수
- `GET /reports/weekly-summary` - 주간 성과 요약
- `GET /reports/ranking` - 랭킹 조회
- 타임시리즈 데이터 조회 엔드포인트 없음

### 수정 방안

**reports.controller.ts에 새 엔드포인트 추가:**

```typescript
@Get(':type')
@ApiOperation({ summary: '센서 데이터 타임시리즈 리포트' })
@ApiParam({ name: 'type', enum: ['temp', 'humidity', 'weight', 'voc'] })
@ApiQuery({ name: 'range', enum: ['1일', '1주일', '1개월', '1년'] })
async getTimeseriesReport(
  @CurrentUser() user: User,
  @Param('type') type: 'temp' | 'humidity' | 'weight' | 'voc',
  @Query('range') range: '1일' | '1주일' | '1개월' | '1년' = '1일',
) {
  const data = await this.reportsService.getTimeseriesData(user.id, type, range);
  return {
    success: true,
    data,
  };
}
```

**reports.service.ts에 메서드 추가:**

```typescript
async getTimeseriesData(
  userId: string,
  type: 'temp' | 'humidity' | 'weight' | 'voc',
  range: '1일' | '1주일' | '1개월' | '1년',
): Promise<{
  dataPoints: Array<{ time: string; value: number; timestamp: number }>;
  summary: {
    current: number;
    max: { value: number; time: string };
    min: { value: number; time: string };
    average: number;
    referenceDate: string;
  };
}> {
  // 사용자의 기기 조회
  const device = await this.deviceRepository.findOne({
    where: { user: { id: userId } },
    order: { createdAt: 'ASC' },
  });

  if (!device) {
    return this.getEmptyReport();
  }

  // 날짜 범위 계산
  const now = new Date();
  const start = new Date(now);
  
  switch (range) {
    case '1일':
      start.setDate(start.getDate() - 1);
      break;
    case '1주일':
      start.setDate(start.getDate() - 7);
      break;
    case '1개월':
      start.setMonth(start.getMonth() - 1);
      break;
    case '1년':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  // 센서 데이터 조회
  const sensorData = await this.sensorDataRepository.find({
    where: {
      device: { id: device.id },
      measuredAt: Between(start, now),
    },
    order: { measuredAt: 'ASC' },
  });

  // 데이터 포인트 생성
  const dataPoints = sensorData.map((data) => {
    let value: number;
    switch (type) {
      case 'temp':
        value = Number(data.temperature ?? 0);
        break;
      case 'humidity':
        value = Number(data.humidity ?? 0);
        break;
      case 'weight':
        value = Number(data.weight ?? 0) / 1000; // g -> kg
        break;
      case 'voc':
        value = Number(data.gas ?? 0);
        break;
    }

    const date = new Date(data.measuredAt);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return {
      time: `${hours}:${minutes}`,
      value: Number(value.toFixed(1)),
      timestamp: date.getTime(),
    };
  });

  // 요약 계산
  const values = dataPoints.map((p) => p.value);
  const current = values[values.length - 1] ?? 0;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const maxIndex = values.indexOf(maxValue);
  const minIndex = values.indexOf(minValue);
  const average = values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;

  return {
    dataPoints,
    summary: {
      current: Number(current.toFixed(1)),
      max: {
        value: Number(maxValue.toFixed(1)),
        time: dataPoints[maxIndex]?.time ?? '00:00',
      },
      min: {
        value: Number(minValue.toFixed(1)),
        time: dataPoints[minIndex]?.time ?? '00:00',
      },
      average: Number(average.toFixed(1)),
      referenceDate: now.toISOString().split('T')[0].replace(/-/g, '.'),
    },
  };
}

private getEmptyReport() {
  return {
    dataPoints: [],
    summary: {
      current: 0,
      max: { value: 0, time: '00:00' },
      min: { value: 0, time: '00:00' },
      average: 0,
      referenceDate: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
    },
  };
}
```

**reports.module.ts에 SensorData 엔티티 추가:**

```typescript
imports: [
  TypeOrmModule.forFeature([Device, ProcessingSession, SensorData]),
  // ...
]
```

---

## 4. 카메라 상태 API 누락 ⚠️ **중요**

### 프론트엔드 기대 형식

**파일:** `/home/ubuntu/client-temp/src/hooks/useCameraStatus.ts`

```typescript
// 프론트엔드가 기대하는 엔드포인트
GET /api/cameras/{cameraId}/status

// 응답 형식
{
  cameraId: string;
  connected: boolean;
}
```

### 백엔드 현재 상태

- `GET /cameras/{deviceId}` - 카메라 정보 조회 (connectionStatus 포함)
- `POST /cameras/{deviceId}/test-stream` - 스트림 연결 테스트
- 상태 조회 전용 엔드포인트 없음

### 수정 방안

**camera.controller.ts에 엔드포인트 추가:**

```typescript
@Get(':deviceId/status')
@ApiOperation({ summary: '카메라 연결 상태 조회' })
async getCameraStatus(@Param('deviceId') deviceId: string) {
  const camera = await this.cameraService.getCamera(deviceId);
  return {
    success: true,
    data: {
      cameraId: deviceId,
      connected: camera.connectionStatus === 'ONLINE',
    },
  };
}
```

또는 기존 `getCamera` 엔드포인트의 응답 형식을 프론트엔드에 맞게 수정:

```typescript
@Get(':deviceId')
@ApiOperation({ summary: '카메라 조회' })
async get(@Param('deviceId') deviceId: string) {
  const data = await this.cameraService.getCamera(deviceId);
  return {
    success: true,
    data: {
      ...data,
      connected: data.connectionStatus === 'ONLINE', // 추가
    },
  };
}
```

---

## 5. 캐릭터 이름 저장 API 연동 ⚠️ **중요**

### 프론트엔드 현재 상태

**파일:** `/home/ubuntu/client-temp/src/screens/Home/HomeScreen.tsx`

- 캐릭터 이름을 로컬 상태(`useAppState`)에만 저장
- 백엔드 API 호출 없음

### 백엔드 현재 상태

- `PATCH /character/me` - 캐릭터 정보 수정 (characterName 포함)

### 수정 방안

**프론트엔드에 API 호출 추가 필요:**

1. 새 서비스 파일 생성: `src/services/api/character.ts`

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export const CharacterAPI = {
  async updateName(characterName: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/character/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ characterName }),
    });

    if (!response.ok) {
      throw new Error(`Character API request failed: ${response.status}`);
    }

    return response.json();
  },
};
```

2. HomeScreen에서 API 호출 추가

---

## 6. API 버전 경로 확인 필요

### 프론트엔드

- `process.env.EXPO_PUBLIC_API_BASE_URL` 사용
- 경로에 버전 포함 여부 불명확

### 백엔드

- `/api/v1/...` 형식 사용 (main.ts에서 설정)

### 수정 방안

**프론트엔드 환경 변수 설정 확인:**

```bash
# .env 파일에 다음 추가 필요
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

또는 프론트엔드 코드에서 자동으로 `/api/v1` 접두사 추가

---

## 7. 인증 토큰 처리

### 프론트엔드 현재 상태

- API 호출 시 Authorization 헤더 미설정 (TODO 상태)
- 로그인 화면에 카카오 로그인만 있음 (미구현)

### 백엔드 현재 상태

- JWT 인증 필요 (`@UseGuards(JwtAuthGuard)`)
- 이메일/비밀번호 기반 로그인만 제공

### 수정 방안

**프론트엔드에 인증 처리 추가:**

1. 토큰 저장 (AsyncStorage 사용)
2. API 호출 시 헤더에 토큰 포함
3. 로그인 화면에 이메일/비밀번호 로그인 추가 또는 카카오 OAuth 구현

---

## 8. API 응답 형식 통일

### 백엔드 현재 형식

```typescript
{
  success: true,
  data: { ... }
}
```

### 프론트엔드 기대 형식

- 대부분의 경우 동일하지만, 일부 엔드포인트는 직접 데이터 반환 기대

### 확인 필요

- 모든 새로 추가하는 엔드포인트는 `{ success: true, data: ... }` 형식 유지

---

## 우선순위 요약

### 🔴 긴급 (즉시 수정 필요)

1. **설정 API 엔드포인트** - `POST /settings/display`, `POST /settings/alerts` 추가
2. **대시보드 API** - `GET /dashboard` 엔드포인트 및 서비스 구현
3. **리포트 API** - `GET /reports/:type?range=...` 엔드포인트 추가

### 🟡 중요 (빠른 시일 내 수정)

4. **카메라 상태 API** - `GET /cameras/:deviceId/status` 추가
5. **캐릭터 이름 저장** - 프론트엔드에 API 호출 추가 (백엔드는 이미 구현됨)

### 🟢 개선 (점진적 수정)

6. **API 버전 경로** - 환경 변수 설정 확인
7. **인증 토큰 처리** - 프론트엔드에 토큰 관리 추가
8. **카카오 로그인** - OAuth 구현 또는 이메일 로그인으로 변경

---

## 구현 체크리스트

- [ ] 설정 API 엔드포인트 추가 (`POST /settings/display`, `POST /settings/alerts`)
- [ ] 대시보드 모듈 생성 및 API 구현
- [ ] 리포트 타임시리즈 API 구현
- [ ] 카메라 상태 API 추가
- [ ] 프론트엔드에 캐릭터 이름 저장 API 연동
- [ ] 프론트엔드 환경 변수 설정 확인
- [ ] 프론트엔드에 인증 토큰 처리 추가


