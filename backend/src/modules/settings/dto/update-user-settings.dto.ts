import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

class SettingEntryDto {
  @ApiProperty({ example: 'character.color' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'blue' })
  @IsString()
  @IsOptional()
  value?: string;
}

export class UpdateUserSettingsDto {
  @ApiProperty({ type: [SettingEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  settings: SettingEntryDto[];
}

