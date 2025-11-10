import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '새 닉네임' })
  @IsString()
  @IsOptional()
  @Length(2, 50)
  nickname?: string;
}

