import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UnpairDeviceDto {
  @ApiProperty({ example: 'HANIBI-ESP32-001', description: '페어링 해제할 기기 ID' })
  @IsString()
  @Length(3, 128)
  deviceId: string;
}

