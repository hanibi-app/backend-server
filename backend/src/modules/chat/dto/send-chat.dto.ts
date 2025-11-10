import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendChatDto {
  @ApiProperty({ example: '현재 기기 상태 알려줘' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: { intent: 'STATUS_QUERY' } })
  @IsOptional()
  metadata?: Record<string, any>;
}

