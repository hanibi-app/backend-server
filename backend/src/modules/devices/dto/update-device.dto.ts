import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DeviceConnectionStatus, DeviceStatus } from '../entities/device.entity';

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: '거실 음식물 처리기' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deviceName?: string;

  @ApiPropertyOptional({ example: DeviceConnectionStatus.Online, enum: DeviceConnectionStatus })
  @IsOptional()
  @IsEnum(DeviceConnectionStatus)
  connectionStatus?: DeviceConnectionStatus;

  @ApiPropertyOptional({ example: DeviceStatus.Processing, enum: DeviceStatus })
  @IsOptional()
  @IsEnum(DeviceStatus)
  deviceStatus?: DeviceStatus;
}

