import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ReportsService } from './services/reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'reports',
  version: '1',
})
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('eco-score')
  @ApiOperation({ summary: '환경경 점수 조회' })
  async getEcoScore(@CurrentUser() user: User) {
    const result = await this.reportsService.getEcoScore(user.id);
    return {
      success: true,
      data: {
        score: result.score,
        components: result.components,
      },
    };
  }

  @Get('weekly-summary')
  @ApiOperation({ summary: '주간 성과 요약' })
  async getWeeklySummary(@CurrentUser() user: User) {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const summary = await this.reportsService.getWeeklySummary(user.id, monday, sunday);

    const processedAmountChange = this.calculateChangeRate(
      summary.previous.processedAmount,
      summary.current.processedAmount,
    );
    const co2Change = this.calculateChangeRate(summary.previous.co2Savings, summary.current.co2Savings);
    const efficiencyChange = this.calculateChangeRate(
      summary.previous.energyEfficiency,
      summary.current.energyEfficiency,
    );

    return {
      success: true,
      data: {
        weekStart: monday.toISOString(),
        weekEnd: sunday.toISOString(),
        processedAmount: {
          value: Number(summary.current.processedAmount.toFixed(2)),
          previousValue: Number(summary.previous.processedAmount.toFixed(2)),
          changeRate: processedAmountChange,
        },
        co2Savings: {
          value: Number(summary.current.co2Savings.toFixed(2)),
          previousValue: Number(summary.previous.co2Savings.toFixed(2)),
          changeRate: co2Change,
        },
        energyEfficiency: {
          value: Number(summary.current.energyEfficiency.toFixed(2)),
          previousValue: Number(summary.previous.energyEfficiency.toFixed(2)),
          changeRate: efficiencyChange,
        },
      },
    };
  }

  @Get('ranking')
  @ApiOperation({ summary: '환경경 랭킹 조회' })
  async getRanking(@CurrentUser() user: User, @Query('period') period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'WEEKLY') {
    const entries = await this.reportsService.getRanking(period);
    const now = new Date();

    let start = new Date(now);
    let end = new Date(now);

    if (period === 'DAILY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'WEEKLY') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    const rankings = entries.map((entry, idx) => ({
      rank: idx + 1,
      userId: entry.userId,
      nickname: entry.nickname,
      processedAmount: Number(entry.processedAmount ?? 0),
      isCurrentUser: entry.userId === user.id,
    }));

    return {
      success: true,
      data: {
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        rankings,
      },
    };
  }

  private calculateChangeRate(previous: number, current: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}

