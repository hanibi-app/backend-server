import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expires = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '3600');
        const expiresIn = resolveExpirationToSeconds(expires);
        return {
          secret: configService.get<string>('JWT_ACCESS_TOKEN_SECRET', 'dev-secret'),
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

const resolveExpirationToSeconds = (raw: string): number => {
  if (/^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }

  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return parseInt(raw, 10) || 900;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return value;
  }
};

