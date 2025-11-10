import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCharacterDto {
  @ApiProperty({ example: '한니비' })
  @IsString()
  @Length(2, 50)
  characterName: string;

  @ApiProperty({
    type: [String],
    description: '선택한 캐릭터 특성 옵션 ID 목록',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  attributeOptionIds: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  makeCurrent?: boolean;
}

