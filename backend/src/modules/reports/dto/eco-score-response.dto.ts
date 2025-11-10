import { ApiProperty } from '@nestjs/swagger';

export class EcoScoreResponseDto {
  @ApiProperty({ example: 82 })
  score: number;

  @ApiProperty({ example: 0.8 })
  processedAmount: number;

  @ApiProperty({ example: 0.3 })
  efficiency: number;

  @ApiProperty({ example: 1.2 })
  co2Savings: number;

  @ApiProperty({ example: '2025-11-10T12:34:56.000Z' })
  calculatedAt: string;

  @ApiProperty({
    example: {
      temperature: 25.4,
      humidity: 60,
      lifeScore: 85,
    },
  })
  metrics: Record<string, number | null>;
}

