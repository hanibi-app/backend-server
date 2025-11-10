import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SensorValuesDto } from './sensor-values.dto';

export enum ProcessingStatus {
  Idle = 'IDLE',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Error = 'ERROR',
}

export class SensorDataDto {
  @IsString({ message: 'deviceId는 문자열이어야 합니다.' })
  deviceId: string;

  @IsISO8601({}, { message: 'timestamp는 ISO8601 형식이어야 합니다.' })
  timestamp: string;

  @ValidateNested()
  @Type(() => SensorValuesDto)
  sensorData: SensorValuesDto;

  @IsEnum(ProcessingStatus, { message: 'processingStatus 값이 올바르지 않습니다.' })
  processingStatus: ProcessingStatus;

  @IsString({ message: 'sessionId는 문자열이어야 합니다.' })
  @IsOptional()
  sessionId?: string;
}

