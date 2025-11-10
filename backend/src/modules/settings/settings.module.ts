import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationHistory } from './entities/notification-history.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UserSetting } from './entities/user-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting, NotificationSetting, NotificationHistory])],
  controllers: [SettingsController, NotificationsController],
  providers: [SettingsService, NotificationsService],
  exports: [SettingsService, NotificationsService],
})
export class SettingsModule {}

