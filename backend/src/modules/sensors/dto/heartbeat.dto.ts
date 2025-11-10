import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  deviceId: string;

  @IsISO8601()
  timestamp: string;

  @IsNumber()
  @IsOptional()
  wifiSignal?: number;

  @IsString()
  @IsOptional()
  firmwareVersion?: string;
}

