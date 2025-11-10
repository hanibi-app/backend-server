import { ApiProperty } from '@nestjs/swagger';

class RankingEntryDto {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: 'USER-123' })
  userId: string;

  @ApiProperty({ example: '한니비유저' })
  nickname: string;

  @ApiProperty({ example: 24.5 })
  processedAmount: number;

  @ApiProperty({ example: true })
  isCurrentUser: boolean;
}

export class RankingResponseDto {
  @ApiProperty({ example: 'WEEKLY' })
  period: string;

  @ApiProperty({ example: '2025-11-03' })
  startDate: string;

  @ApiProperty({ example: '2025-11-09' })
  endDate: string;

  @ApiProperty({ type: [RankingEntryDto] })
  rankings: RankingEntryDto[];
}

