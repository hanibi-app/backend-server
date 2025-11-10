import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { ProcessingSession } from '../../processing/entities/processing-session.entity';
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
}

