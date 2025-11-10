import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChatService } from '../modules/chat/chat.service';
import { DevicesService } from '../modules/devices/devices.service';
import { NotificationType } from '../modules/settings/entities/notification-setting.entity';
import { NotificationsService } from '../modules/settings/notifications.service';
import { QueueNames } from '../queues/queue.constants';

interface NotificationJob {
  userId: string;
  deviceId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Processor(QueueNames.Notification)
@Injectable()
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly devicesService: DevicesService,
    private readonly chatService: ChatService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    this.logger.debug(
      `알림 전송: userId=${job.data.userId}, type=${job.data.type}, title=${job.data.title}`,
    );

    await this.notificationsService.logNotification({
      userId: job.data.userId,
      deviceId: job.data.deviceId,
      type: job.data.type,
      title: job.data.title,
      message: job.data.message,
    });

    if (job.data.deviceId) {
      const device = await this.devicesService.findByDeviceIdWithUser(job.data.deviceId);
      if (device) {
        await this.chatService.createSystemMessage(device, job.data.message, {
          notificationType: job.data.type,
          ...(job.data.metadata ?? {}),
        });
      }
    }
  }
}

