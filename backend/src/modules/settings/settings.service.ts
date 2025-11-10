import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationSetting, NotificationType } from './entities/notification-setting.entity';
import { UserSetting } from './entities/user-setting.entity';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
  ) {}

  async listUserSettings(user: User): Promise<Record<string, string | null>> {
    const settings = await this.userSettingRepository.find({
      where: { user: { id: user.id } },
    });

    return settings.reduce<Record<string, string | null>>((acc, setting) => {
      acc[setting.settingKey] = setting.settingValue ?? null;
      return acc;
    }, {});
  }

  async updateUserSettings(user: User, payload: UpdateUserSettingsDto): Promise<Record<string, string | null>> {
    const keys = payload.settings.map((setting) => setting.key);
    const existing = await this.userSettingRepository.find({
      where: {
        user: { id: user.id },
        settingKey: In(keys),
      },
    });
    const existingMap = new Map(existing.map((item) => [item.settingKey, item]));

    for (const entry of payload.settings) {
      const entity = existingMap.get(entry.key);
      if (entity) {
        entity.settingValue = entry.value ?? null;
        await this.userSettingRepository.save(entity);
      } else {
        await this.userSettingRepository.save(
          this.userSettingRepository.create({
            user,
            settingKey: entry.key,
            settingValue: entry.value ?? null,
          }),
        );
      }
    }

    return this.listUserSettings(user);
  }

  async listNotificationSettings(user: User): Promise<NotificationSetting[]> {
    return this.notificationSettingRepository.find({
      where: { user: { id: user.id } },
    });
  }

  async updateNotificationSettings(
    user: User,
    payload: UpdateNotificationSettingsDto,
  ): Promise<NotificationSetting[]> {
    const types = payload.preferences.map((pref) => pref.type);
    const existing = await this.notificationSettingRepository.find({
      where: {
        user: { id: user.id },
        notificationType: In(types),
      },
    });
    const existingMap = new Map(existing.map((item) => [item.notificationType, item]));

    for (const preference of payload.preferences) {
      const entity = existingMap.get(preference.type);
      if (entity) {
        entity.isEnabled = preference.isEnabled;
        entity.quietStart = preference.quietStart;
        entity.quietEnd = preference.quietEnd;
        await this.notificationSettingRepository.save(entity);
      } else {
        await this.notificationSettingRepository.save(
          this.notificationSettingRepository.create({
            user,
            notificationType: preference.type,
            isEnabled: preference.isEnabled,
            quietStart: preference.quietStart,
            quietEnd: preference.quietEnd,
          }),
        );
      }
    }

    return this.listNotificationSettings(user);
  }

  async ensureDefaultNotificationSettings(user: User): Promise<void> {
    const defaults: NotificationType[] = [
      NotificationType.ProcessingCompleted,
      NotificationType.StateAlert,
      NotificationType.Cleaning,
      NotificationType.WeeklyReport,
    ];

    const existing = await this.listNotificationSettings(user);
    const existingTypes = new Set(existing.map((item) => item.notificationType));

    for (const type of defaults) {
      if (!existingTypes.has(type)) {
        await this.notificationSettingRepository.save(
          this.notificationSettingRepository.create({
            user,
            notificationType: type,
            isEnabled: true,
          }),
        );
      }
    }
  }
}

