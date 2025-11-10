import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('notification_history')
export class NotificationHistory extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device?: Device;

  @Column({ type: 'varchar', length: 50 })
  notificationType: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 20, default: 'SENT' })
  status: 'SENT' | 'FAILED' | 'PENDING';

  @Column({ nullable: true })
  sentAt?: Date;
}

