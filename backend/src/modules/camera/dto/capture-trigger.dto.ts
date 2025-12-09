import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export enum CaptureTriggerType {
  FoodInputBefore = 'FOOD_INPUT_BEFORE',
  FoodInputAfter = 'FOOD_INPUT_AFTER',
}

export class CaptureTriggerDto {
  @ApiProperty({
    example: 'ETCOM-001',
    description: '디바이스 고유 ID',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    enum: CaptureTriggerType,
    example: CaptureTriggerType.FoodInputBefore,
    description: '캡처 트리거 타입 (FOOD_INPUT_BEFORE: 음식 투입 전, FOOD_INPUT_AFTER: 음식 투입 후)',
    enumName: 'CaptureTriggerType',
  })
  @IsEnum(CaptureTriggerType)
  triggerType: CaptureTriggerType;
}

