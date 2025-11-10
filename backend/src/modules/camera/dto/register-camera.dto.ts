import { IsOptional, IsString, Matches } from 'class-validator';

export class RegisterCameraDto {
  @IsString()
  deviceId: string;

  @IsString()
  @Matches(/^rtsp(s)?:\/\//, {
    message: 'rtspUrl은 rtsp:// 또는 rtsps:// 로 시작해야 합니다.',
  })
  rtspUrl: string;

  @IsString()
  @IsOptional()
  cameraModel?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

