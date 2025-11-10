import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationHistory } from './entities/notification-history.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationHistory)
    private readonly notificationHistoryRepository: Repository<NotificationHistory>,
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepository: Repository<NotificationSetting>,
  ) {}

  async logNotification(payload: {
    userId: string;
    deviceId?: string;
    type: string;
    title: string;
    message: string;
    status?: 'SENT' | 'FAILED' | 'PENDING';
  }): Promise<NotificationHistory> {
    const entity = this.notificationHistoryRepository.create({
      user: { id: payload.userId } as any,
      device: payload.deviceId ? ({ id: payload.deviceId } as any) : undefined,
      notificationType: payload.type,
      title: payload.title,
      message: payload.message,
      status: payload.status ?? 'SENT',
      sentAt: payload.status === 'SENT' ? new Date() : undefined,
    });

    return this.notificationHistoryRepository.save(entity);
  }

  async listHistory(user: User, limit = 20): Promise<NotificationHistory[]> {
    return this.notificationHistoryRepository.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['device'],
    });
  }

  async getNotificationSettings(user: User): Promise<NotificationSetting[]> {
    return this.notificationSettingRepository.find({
      where: { user: { id: user.id } },
    });
  }
}

