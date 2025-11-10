import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, IsObject, IsPositive, ValidateIf } from 'class-validator';
import { DeviceCommandType } from '../enums/device-command-type.enum';

export class SendCommandDto {
  @ApiProperty({ enum: DeviceCommandType, example: DeviceCommandType.Start })
  @IsEnum(DeviceCommandType)
  commandType: DeviceCommandType;

  @ApiPropertyOptional({ example: 22 })
  @ValidateIf((o) => o.commandType === DeviceCommandType.SetTemperature)
  @IsNumber()
  @IsPositive()
  temperature?: number;

  @ApiPropertyOptional({ example: 5 })
  @ValidateIf((o) => o.commandType === DeviceCommandType.UpdateInterval)
  @IsNumber()
  @IsPositive()
  intervalSeconds?: number;

  @ApiPropertyOptional({ example: { custom: true } })
  @IsOptional()
  @IsObject()
  extraPayload?: Record<string, any>;
}

