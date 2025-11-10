import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queues/queue.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { CameraModule } from './modules/camera/camera.module';
import { DevicesModule } from './modules/devices/devices.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { UsersModule } from './modules/users/users.module';
import { RealtimeModule } from './realtime/realtime.module';
import { WorkersModule } from './workers/workers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CharacterModule } from './modules/character/character.module';
import { ChatModule } from './modules/chat/chat.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate,
      expandVariables: true,
    }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    QueueModule,
    UsersModule,
    AuthModule,
    DevicesModule,
    SensorsModule,
    RealtimeModule,
    ReportsModule,
    ChatModule,
    CharacterModule,
    SettingsModule,
    CameraModule,
    WorkersModule,
  ],
})
export class AppModule {}
