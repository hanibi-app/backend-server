import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationType } from '../entities/notification-setting.entity';

class NotificationPreferenceDto {
  @ApiProperty({ example: 'PROCESSING_COMPLETED', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ example: '22:00', required: false })
  @IsOptional()
  @IsString()
  quietStart?: string;

  @ApiProperty({ example: '07:00', required: false })
  @IsOptional()
  @IsString()
  quietEnd?: string;
}

export class UpdateNotificationSettingsDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ArrayMinSize(1)
  preferences: NotificationPreferenceDto[];
}

