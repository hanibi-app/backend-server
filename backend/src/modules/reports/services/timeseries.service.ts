import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ProcessingSession } from '../../processing/entities/processing-session.entity';
import { TimeseriesStats, TimeseriesPeriod } from '../entities/timeseries-stats.entity';

export interface AggregationResult {
  processedAmount: number;
  co2Savings: number;
  energyEfficiency: number;
  count: number;
}

@Injectable()
export class TimeseriesService {
  constructor(
    @InjectRepository(TimeseriesStats)
    private readonly timeseriesRepository: Repository<TimeseriesStats>,
    @InjectRepository(ProcessingSession)
    private readonly sessionRepository: Repository<ProcessingSession>,
  ) {}

  async getWeeklySummary(userId: string, start: Date, end: Date): Promise<AggregationResult> {
    const raw = await this.sessionRepository
      .createQueryBuilder('session')
      .select('SUM(session.processedAmount)', 'processedAmount')
      .addSelect('SUM(session.energyConsumed)', 'energy')
      .addSelect('AVG(session.efficiencyScore)', 'efficiency')
      .innerJoin('session.device', 'device')
      .innerJoin('device.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('session.sessionStatus = :status', { status: 'COMPLETED' })
      .andWhere('session.completedAt BETWEEN :start AND :end', { start, end })
      .getRawOne<{
        processedAmount: string | null;
        energy: string | null;
        efficiency: string | null;
      }>();

    const processedAmount = Number(raw?.processedAmount ?? 0);
    const energy = Number(raw?.energy ?? 0);
    const efficiency = Number(raw?.efficiency ?? 0);
    const co2Savings = this.estimateCo2Savings(processedAmount);
    const energyEfficiency = energy > 0 ? Math.round((processedAmount / energy) * 100) / 100 : 0;

    return {
      processedAmount,
      co2Savings,
      energyEfficiency,
      count: processedAmount > 0 ? 1 : 0,
    };
  }

  async saveTimeseriesSnapshot(params: {
    deviceId: string;
    periodType: TimeseriesPeriod;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<void> {
    const existing = await this.timeseriesRepository.findOne({
      where: {
        periodType: params.periodType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        device: { deviceId: params.deviceId },
      },
      relations: ['device'],
    });

    if (existing) {
      const aggregates = await this.aggregateSessions(params.deviceId, params.periodStart, params.periodEnd);
      existing.totalProcessedAmount = aggregates.processedAmount;
      existing.avgLifeScore = aggregates.avgLifeScore;
      await this.timeseriesRepository.save(existing);
      return;
    }

    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.device', 'device')
      .where('device.deviceId = :deviceId', { deviceId: params.deviceId })
      .andWhere('session.completedAt BETWEEN :start AND :end', {
        start: params.periodStart,
        end: params.periodEnd,
      })
      .getOne();

    const aggregates = await this.aggregateSessions(params.deviceId, params.periodStart, params.periodEnd);

    const stats = this.timeseriesRepository.create({
      device: session?.device ?? undefined,
      periodType: params.periodType,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      totalProcessedAmount: aggregates.processedAmount,
      avgLifeScore: aggregates.avgLifeScore,
    });

    await this.timeseriesRepository.save(stats);
  }

  private async aggregateSessions(deviceId: string, start: Date, end: Date): Promise<{ processedAmount: number; avgLifeScore: number }> {
    const raw = await this.sessionRepository
      .createQueryBuilder('session')
      .select('SUM(session.processedAmount)', 'processedAmount')
      .addSelect('AVG(session.efficiencyScore)', 'avgLifeScore')
      .innerJoin('session.device', 'device')
      .where('device.deviceId = :deviceId', { deviceId })
      .andWhere('session.completedAt BETWEEN :start AND :end', { start, end })
      .andWhere('session.sessionStatus = :status', { status: 'COMPLETED' })
      .getRawOne<{ processedAmount: string | null; avgLifeScore: string | null }>();

    return {
      processedAmount: Number(raw?.processedAmount ?? 0),
      avgLifeScore: Number(raw?.avgLifeScore ?? 0),
    };
  }

  async getTimeseries(deviceId: string, periodType: TimeseriesPeriod, limit = 7): Promise<TimeseriesStats[]> {
    return this.timeseriesRepository.find({
      where: { device: { deviceId }, periodType },
      relations: ['device'],
      order: { periodStart: 'DESC' },
      take: limit,
    });
  }

  private estimateCo2Savings(processedAmount: number): number {
    const estimatedPerKg = 0.5;
    return Number((processedAmount * estimatedPerKg).toFixed(2));
  }
}

