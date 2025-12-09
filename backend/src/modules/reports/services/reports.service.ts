import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { ProcessingSession } from '../../processing/entities/processing-session.entity';
import { SensorData } from '../../sensors/entities/sensor-data.entity';
import { EcoScoreResult, EcoScoreService } from './eco-score.service';
import { AggregationResult, TimeseriesService } from './timeseries.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly ecoScoreService: EcoScoreService,
    private readonly timeseriesService: TimeseriesService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(ProcessingSession)
    private readonly sessionRepository: Repository<ProcessingSession>,
    @InjectRepository(SensorData)
    private readonly sensorDataRepository: Repository<SensorData>,
  ) {}

  async getEcoScore(userId: string): Promise<EcoScoreResult> {
    return this.ecoScoreService.calculateLatestScoreForUser(userId);
  }

  async calculateEcoScoreForSession(sessionId: string): Promise<EcoScoreResult> {
    return this.ecoScoreService.calculateScoreForSession(sessionId);
  }

  async getWeeklySummary(
    userId: string,
    monday: Date,
    sunday: Date,
  ): Promise<{ current: AggregationResult; previous: AggregationResult }> {
    const thisWeek = await this.timeseriesService.getWeeklySummary(userId, monday, sunday);
    const prevStart = new Date(monday);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(sunday);
    prevEnd.setDate(prevEnd.getDate() - 7);
    const previousWeek = await this.timeseriesService.getWeeklySummary(userId, prevStart, prevEnd);

    return {
      current: thisWeek,
      previous: previousWeek,
    };
  }

  async getRanking(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', limit = 10) {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .select('user.id', 'userId')
      .addSelect('user.nickname', 'nickname')
      .addSelect('SUM(session.processedAmount)', 'processedAmount')
      .innerJoin('session.device', 'device')
      .innerJoin('device.user', 'user')
      .where('session.sessionStatus = :status', { status: 'COMPLETED' });

    const now = new Date();
    const start = new Date(now);

    if (period === 'DAILY') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'WEEKLY') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    qb.andWhere('session.completedAt >= :start', { start });
    qb.groupBy('user.id');
    qb.addGroupBy('user.nickname');
    qb.orderBy('processedAmount', 'DESC');
    qb.limit(limit);

    return qb.getRawMany<{ userId: string; nickname: string; processedAmount: string }>();
  }

  async listUserDevices(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
    });
  }

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
    // 사용자의 첫 번째 기기 조회
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
    const current = values.length > 0 ? values[values.length - 1] : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    const maxIndex = values.indexOf(maxValue);
    const minIndex = values.indexOf(minValue);
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

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
    const now = new Date();
    return {
      dataPoints: [],
      summary: {
        current: 0,
        max: { value: 0, time: '00:00' },
        min: { value: 0, time: '00:00' },
        average: 0,
        referenceDate: now.toISOString().split('T')[0].replace(/-/g, '.'),
      },
    };
  }
}

