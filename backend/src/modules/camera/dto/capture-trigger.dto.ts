import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export enum CaptureTriggerType {
  Manual = 'MANUAL',
  FoodInputBefore = 'FOOD_INPUT_BEFORE',
  FoodInputAfter = 'FOOD_INPUT_AFTER',
  Error = 'ERROR',
}

export class CaptureTriggerDto {
  @IsString()
  deviceId: string;

  @IsEnum(CaptureTriggerType)
  triggerType: CaptureTriggerType;

  @IsISO8601()
  triggeredAt: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

