import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  ProcessingCompleted = 'PROCESSING_COMPLETED',
  StateAlert = 'STATE_ALERT',
  Cleaning = 'CLEANING',
  WeeklyReport = 'WEEKLY_REPORT',
}

@Entity('notification_settings')
export class NotificationSetting extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  notificationType: NotificationType;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'time', nullable: true })
  quietStart?: string;

  @Column({ type: 'time', nullable: true })
  quietEnd?: string;
}

