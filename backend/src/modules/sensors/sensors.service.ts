import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { Device, DeviceConnectionStatus, DeviceStatus } from '../devices/entities/device.entity';
import { ProcessingSession, ProcessingSessionStatus } from '../processing/entities/processing-session.entity';
import { SensorsGateway } from '../../realtime/gateways/sensors.gateway';
import { CharacterQueueProducer } from '../../queues/producers/character-queue.producer';
import { ReportQueueProducer } from '../../queues/producers/report-queue.producer';
import { SensorQueueProducer } from '../../queues/producers/sensor-queue.producer';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { ProcessingStatus, SensorDataDto } from './dto/sensor-data.dto';
import { ProcessingSummaryDto, SensorEventDto, SensorEventType } from './dto/sensor-event.dto';
import { SensorValuesDto } from './dto/sensor-values.dto';
import { SensorData } from './entities/sensor-data.entity';
import { SensorRequestLog, SensorRequestStatus } from './entities/sensor-request-log.entity';

export interface SensorDataResponse {
  received: boolean;
  storedAt: string;
  characterState: string;
  shouldAlert: boolean;
}

export interface SensorConfigResponse {
  nextInterval: number;
  enabledSensors: Array<keyof SensorValuesDto>;
}

export interface HeartbeatResponse {
  serverTime: string;
  needsUpdate: boolean;
  newCommands: string[];
}

export interface EventResponse {
  snapshotId?: string;
  capturedAt?: string;
}

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);

  constructor(
    @InjectRepository(SensorData)
    private readonly sensorDataRepository: Repository<SensorData>,
    @InjectRepository(ProcessingSession)
    private readonly processingSessionRepository: Repository<ProcessingSession>,
    @InjectRepository(SensorRequestLog)
    private readonly requestLogRepository: Repository<SensorRequestLog>,
    private readonly devicesService: DevicesService,
    private readonly sensorQueueProducer: SensorQueueProducer,
    private readonly characterQueueProducer: CharacterQueueProducer,
    private readonly reportQueueProducer: ReportQueueProducer,
    private readonly sensorsGateway: SensorsGateway,
  ) {}

  async processSensorData(
    payload: SensorDataDto,
  ): Promise<{ data: SensorDataResponse; config: SensorConfigResponse }> {
    // COMPLETED 상태는 /api/v1/sensors/events API를 사용해야 함
    if (payload.processingStatus === ProcessingStatus.Completed) {
      throw new BadRequestException(
        'COMPLETED 상태는 /api/v1/sensors/events API를 사용하세요. 작업이 끝나면 IDLE 상태로 전송하세요.',
      );
    }

    const sanitizedValues = this.sanitizeSensorValues(payload.sensorData);

    // timestamp가 없으면 현재 시간 사용 (하드웨어 개발 편의성)
    const measuredAt = payload.timestamp ? new Date(payload.timestamp) : new Date();

    const device = await this.devicesService.findOrCreateByDeviceId(payload.deviceId);
    device.deviceStatus = this.mapProcessingStatus(payload.processingStatus);
    device.connectionStatus = DeviceConnectionStatus.Online;
    device.lastHeartbeat = measuredAt;
    await this.sensorDataRepository.manager.save(device);

    const session = payload.sessionId
      ? await this.processingSessionRepository.findOne({ where: { id: payload.sessionId } })
      : null;

    const sensorEntity = this.sensorDataRepository.create({
      device,
      session: session ?? undefined,
      temperature: sanitizedValues.temperature ?? null,
      humidity: sanitizedValues.humidity ?? null,
      weight: sanitizedValues.weight ?? null,
      gas: sanitizedValues.gas ?? null,
      measuredAt,
      rawSensorData: payload.sensorData,
    } as DeepPartial<SensorData>);

    await this.sensorDataRepository.save(sensorEntity);
    await this.sensorQueueProducer.enqueueSensorData({
      deviceId: payload.deviceId,
      measuredAt: measuredAt.toISOString(),
      metrics: {
        temperature: sanitizedValues.temperature ?? null,
        humidity: sanitizedValues.humidity ?? null,
        weight: sanitizedValues.weight ?? null,
        gas: sanitizedValues.gas ?? null,
      },
    });

    this.sensorsGateway.broadcastSensorUpdate({
      deviceId: payload.deviceId,
      measuredAt: measuredAt.toISOString(),
      metrics: {
        temperature: sanitizedValues.temperature ?? null,
        humidity: sanitizedValues.humidity ?? null,
        weight: sanitizedValues.weight ?? null,
        gas: sanitizedValues.gas ?? null,
      },
    });

    this.logger.debug(
      `센서 데이터 수신: deviceId=${payload.deviceId}, status=${payload.processingStatus}`,
    );
    this.logger.verbose(`센서 데이터: ${JSON.stringify(sanitizedValues)}`);

    const storedAt = new Date().toISOString();

    const response: SensorDataResponse = {
      received: true,
      storedAt,
      characterState: this.estimateCharacterState(payload.processingStatus, sanitizedValues),
      shouldAlert: this.shouldTriggerAlert(sanitizedValues, payload.processingStatus),
    };

    const config: SensorConfigResponse = {
      nextInterval: this.calculateNextInterval(payload.processingStatus),
      enabledSensors: this.getEnabledSensors(sanitizedValues),
    };

    return { data: response, config };
  }

  async processHeartbeat(payload: HeartbeatDto): Promise<{ data: HeartbeatResponse; config: Record<string, number> }> {
    this.logger.debug(`하트비트 수신: deviceId=${payload.deviceId}`);

    // timestamp가 없으면 현재 시간 사용
    const heartbeatTime = payload.timestamp ? new Date(payload.timestamp) : new Date();

    const device = await this.devicesService.findOrCreateByDeviceId(payload.deviceId);
    device.connectionStatus = DeviceConnectionStatus.Online;
    device.lastHeartbeat = heartbeatTime;
    await this.sensorDataRepository.manager.save(device);

    const response: HeartbeatResponse = {
      serverTime: new Date().toISOString(),
      needsUpdate: false,
      newCommands: [],
    };

    const config = {
      nextInterval: 30,
      dataInterval: 5,
    };

    return { data: response, config };
  }

  async handleEvent(payload: SensorEventDto): Promise<{ data: EventResponse }> {
    this.logger.log(`이벤트 수신: ${payload.eventType} (deviceId=${payload.deviceId})`);

    // 서버 수신 시간 사용 (하드웨어는 timestamp를 보내지 않음)
    const eventTime = new Date();

    const device = await this.devicesService.findOrCreateByDeviceId(payload.deviceId);

    switch (payload.eventType) {
      case SensorEventType.FoodInputBefore:
      case SensorEventType.FoodInputAfter:
        await this.characterQueueProducer.enqueueCharacterState({
          deviceId: payload.deviceId,
          triggeredAt: eventTime.toISOString(),
          stateRuleId: undefined,
        });
        return {
          data: {
            snapshotId: `snapshot-${Date.now()}`,
            capturedAt: new Date().toISOString(),
          },
        };
      case SensorEventType.ProcessingCompleted:
        await this.handleProcessingCompleted(device, payload);
        break;
      default:
        break;
    }

    return { data: {} };
  }

  async getLatestSensorData(deviceId: string): Promise<SensorValuesDto> {
    this.logger.debug(`최신 센서 데이터 조회: deviceId=${deviceId}`);

    const device = await this.devicesService.findOrCreateByDeviceId(deviceId);
    const latest = await this.sensorDataRepository.findOne({
      where: { device: { id: device.id } },
      order: { measuredAt: 'DESC' },
    });

    if (!latest) {
      return plainToInstance(SensorValuesDto, {
        temperature: null,
        humidity: null,
        weight: null,
        gas: null,
      });
    }

    return plainToInstance(SensorValuesDto, {
      temperature: latest.temperature,
      humidity: latest.humidity,
      weight: latest.weight,
      gas: latest.gas,
    });
  }

  private sanitizeSensorValues(values: SensorValuesDto): SensorValuesDto {
    return plainToInstance(SensorValuesDto, values, {
      enableImplicitConversion: true,
    });
  }

  private estimateCharacterState(status: ProcessingStatus, values: SensorValuesDto): string {
    if (status === ProcessingStatus.Error || values.temperature === null || values.humidity === null) {
      return 'CONCERNED';
    }

    if (status === ProcessingStatus.Processing) {
      return 'FOCUSED';
    }

    const { temperature, humidity } = values;
    if (temperature !== null && temperature > 40) {
      return 'HOT';
    }

    if (humidity !== null && humidity > 80) {
      return 'HUMID';
    }

    return 'HAPPY';
  }

  private shouldTriggerAlert(values: SensorValuesDto, status: ProcessingStatus): boolean {
    if (status === ProcessingStatus.Error) {
      return true;
    }

    if (values.temperature !== null && (values.temperature < -10 || values.temperature > 80)) {
      return true;
    }

    if (values.humidity !== null && (values.humidity < 20 || values.humidity > 90)) {
      return true;
    }

    return false;
  }

  private mapProcessingStatus(status: ProcessingStatus): DeviceStatus {
    switch (status) {
      case ProcessingStatus.Error:
        return DeviceStatus.Error;
      case ProcessingStatus.Processing:
        return DeviceStatus.Processing;
      default:
        return DeviceStatus.Idle;
    }
  }

  private calculateNextInterval(status: ProcessingStatus): number {
    switch (status) {
      case ProcessingStatus.Processing:
        return 5;
      case ProcessingStatus.Idle:
        return 10;
      default:
        return 5;
    }
  }

  private getEnabledSensors(values: SensorValuesDto): Array<keyof SensorValuesDto> {
    const enabled: Array<keyof SensorValuesDto> = ['temperature', 'humidity'];

    if (values.weight !== undefined) {
      enabled.push('weight');
    }

    if (values.gas !== undefined) {
      enabled.push('gas');
    }

    return enabled;
  }

  private logProcessingSummary(summary?: ProcessingSummaryDto): void {
    if (!summary) {
      return;
    }

    this.logger.log(
      `처리 요약: processed=${summary.processedAmount}kg duration=${summary.durationMinutes}min energy=${summary.energyConsumed}kWh`,
    );
  }

  private async handleProcessingCompleted(
    device: Device,
    payload: SensorEventDto,
  ): Promise<void> {
    const completedAt = new Date();

    // eventData가 있으면 사용, 없으면 null로 처리 세션 생성
    const session = this.processingSessionRepository.create({
      device,
      sessionStatus: ProcessingSessionStatus.Completed,
      processedAmount: payload.eventData?.processedAmount ?? null,
      initialWeight: payload.eventData?.initialWeight ?? null,
      finalWeight: payload.eventData?.finalWeight ?? null,
      durationMinutes: payload.eventData?.durationMinutes ?? null,
      energyConsumed: payload.eventData?.energyConsumed ?? null,
      completedAt,
    } as DeepPartial<ProcessingSession>);

    await this.processingSessionRepository.save(session);

    if (payload.eventData) {
      this.logProcessingSummary(payload.eventData);
    }

    await this.characterQueueProducer.enqueueCharacterState({
      deviceId: device.deviceId,
      triggeredAt: completedAt.toISOString(),
      stateRuleId: undefined,
    });

    if (device.user?.id) {
      await this.reportQueueProducer.enqueueReport({
        userId: device.user.id,
        sessionId: session.id,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  async getRequestLogs(
    deviceId?: string,
    status?: string,
    limit: number = 50,
  ): Promise<SensorRequestLog[]> {
    const where: FindOptionsWhere<SensorRequestLog> = {};

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (status) {
      where.status = status as SensorRequestStatus;
    }

    return this.requestLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  async getSensorDataByDate(
    deviceId: string,
    date: string,
  ): Promise<SensorData[]> {
    this.logger.debug(`센서 데이터 조회: deviceId=${deviceId}, date=${date}`);

    const device = await this.devicesService.findOrCreateByDeviceId(deviceId);

    // 날짜 파싱 (YYYY-MM-DD 형식)
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.');
    }

    // 해당 날짜의 시작과 끝 계산 (UTC 기준)
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const sensorData = await this.sensorDataRepository
      .createQueryBuilder('sensor')
      .where('sensor.device_id = :deviceId', { deviceId: device.id })
      .andWhere('sensor.measuredAt >= :startOfDay', { startOfDay })
      .andWhere('sensor.measuredAt <= :endOfDay', { endOfDay })
      .orderBy('sensor.measuredAt', 'ASC')
      .getMany();

    this.logger.debug(`조회된 센서 데이터 개수: ${sensorData.length}`);

    return sensorData;
  }
}

