import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @Length(8, 64)
  password: string;

  @ApiProperty({ example: '한니비유저' })
  @IsString()
  @Length(2, 50)
  nickname: string;
}

