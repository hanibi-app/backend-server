import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessingSession } from '../../processing/entities/processing-session.entity';
import { LifeScoreFormula } from '../entities/life-score-formula.entity';

export interface EcoScoreComponents {
  processedAmount: number;
  efficiency: number;
  co2Savings: number;
  metrics: Record<string, number | null>;
}

export interface EcoScoreResult {
  score: number;
  components: EcoScoreComponents;
}

@Injectable()
export class EcoScoreService {
  private readonly logger = new Logger(EcoScoreService.name);

  constructor(
    @InjectRepository(ProcessingSession)
    private readonly processingSessionRepository: Repository<ProcessingSession>,
    @InjectRepository(LifeScoreFormula)
    private readonly lifeScoreFormulaRepository: Repository<LifeScoreFormula>,
  ) {}

  async calculateScoreForSession(sessionId: string): Promise<EcoScoreResult> {
    const session = await this.processingSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['device', 'device.user'],
    });

    if (!session) {
      throw new Error(`Processing session ${sessionId} not found`);
    }

    return this.calculateFromSession(session);
  }

  async calculateLatestScoreForUser(userId: string): Promise<EcoScoreResult> {
    const session = await this.processingSessionRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.device', 'device')
      .innerJoin('device.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('session.sessionStatus = :status', { status: 'COMPLETED' })
      .orderBy('session.completedAt', 'DESC')
      .getOne();

    if (!session) {
      return {
        score: 0,
        components: {
          processedAmount: 0,
          efficiency: 0,
          co2Savings: 0,
          metrics: {},
        },
      };
    }

    return this.calculateFromSession(session);
  }

  private async calculateFromSession(session: ProcessingSession): Promise<EcoScoreResult> {
    const processedAmount = Number(session.processedAmount ?? 0);
    const efficiency = Number(session.efficiencyScore ?? 0);
    const co2Savings = this.estimateCo2Savings(processedAmount);

    const weights = await this.getActiveWeights();
    const normalizedProcessed = Math.min(processedAmount / 5, 1); // assume 5kg/day target
    const normalizedEfficiency = Math.min(efficiency / 100, 1);
    const normalizedCo2 = Math.min(co2Savings / 5, 1); // assume 5kg CO2 saving target

    const score =
      Math.round(
        (normalizedProcessed * weights.processedAmount +
          normalizedEfficiency * weights.efficiency +
          normalizedCo2 * weights.co2Savings) *
          100,
      ) ?? 0;

    return {
      score,
      components: {
        processedAmount,
        efficiency,
        co2Savings,
        metrics: {
          temperature: session.avgTemperature ?? null,
          humidity: session.avgHumidity ?? null,
          energyConsumed: session.energyConsumed ?? null,
        },
      },
    };
  }

  private async getActiveWeights(): Promise<{ processedAmount: number; efficiency: number; co2Savings: number }> {
    const activeFormula = await this.lifeScoreFormulaRepository.findOne({
      where: { isActive: true },
    });

    if (activeFormula?.formulaConfig) {
      const weightConfig = activeFormula.formulaConfig;
      const processedAmount = Number(weightConfig.processedAmount ?? 0.4);
      const efficiency = Number(weightConfig.efficiency ?? 0.35);
      const co2Savings = Number(weightConfig.co2Savings ?? 0.25);
      const sum = processedAmount + efficiency + co2Savings;
      if (sum > 0) {
        return {
          processedAmount: processedAmount / sum,
          efficiency: efficiency / sum,
          co2Savings: co2Savings / sum,
        };
      }
    }

    return {
      processedAmount: 0.4,
      efficiency: 0.35,
      co2Savings: 0.25,
    };
  }

  private estimateCo2Savings(processedAmount: number): number {
    const estimatedPerKg = 0.5; // kg of CO2 saved per kg of processed food waste
    return Number((processedAmount * estimatedPerKg).toFixed(2));
  }
}

