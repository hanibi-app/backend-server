import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class PairDeviceDto {
  @ApiProperty({ example: 'HANIBI-ESP32-001' })
  @IsString()
  @Length(3, 128)
  deviceId: string;

  @ApiPropertyOptional({ example: '주방 음식물 처리기' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  deviceName?: string;
}

