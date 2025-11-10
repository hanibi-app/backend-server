import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @Length(8, 64)
  password: string;

  @ApiProperty({ example: '한니비유저' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  nickname: string;
}

