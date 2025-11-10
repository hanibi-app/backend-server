import { ApiProperty } from '@nestjs/swagger';

class WeeklyMetricDto {
  @ApiProperty({ example: 12.5 })
  value: number;

  @ApiProperty({ example: 8.4 })
  previousValue: number;

  @ApiProperty({ example: 48.8 })
  changeRate: number;
}

export class WeeklySummaryResponseDto {
  @ApiProperty({ example: '2025-11-03' })
  weekStart: string;

  @ApiProperty({ example: '2025-11-09' })
  weekEnd: string;

  @ApiProperty({ type: WeeklyMetricDto })
  processedAmount: WeeklyMetricDto;

  @ApiProperty({ type: WeeklyMetricDto })
  co2Savings: WeeklyMetricDto;

  @ApiProperty({ type: WeeklyMetricDto })
  energyEfficiency: WeeklyMetricDto;
}

