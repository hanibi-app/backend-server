import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum SensorEventType {
  ProcessingStarted = 'PROCESSING_STARTED',
  ProcessingCompleted = 'PROCESSING_COMPLETED',
  ProcessingFailed = 'PROCESSING_FAILED',
  SensorError = 'SENSOR_ERROR',
  TemperatureAlert = 'TEMPERATURE_ALERT',
  CleaningRequired = 'CLEANING_REQUIRED',
  FoodInputBefore = 'FOOD_INPUT_BEFORE',
  FoodInputAfter = 'FOOD_INPUT_AFTER',
  DoorOpened = 'DOOR_OPENED',
  DoorClosed = 'DOOR_CLOSED',
}

export class ProcessingSummaryDto {
  @IsNumber()
  @IsOptional()
  initialWeight?: number | null;

  @IsNumber()
  @IsOptional()
  finalWeight?: number | null;

  @IsNumber()
  @IsOptional()
  processedAmount?: number | null;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number | null;

  @IsNumber()
  @IsOptional()
  energyConsumed?: number | null;
}

export class SensorEventDto {
  @IsString()
  deviceId: string;

  @IsISO8601()
  timestamp: string;

  @IsEnum(SensorEventType)
  eventType: SensorEventType;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @ValidateNested()
  @Type(() => ProcessingSummaryDto)
  @IsOptional()
  eventData?: ProcessingSummaryDto;
}

