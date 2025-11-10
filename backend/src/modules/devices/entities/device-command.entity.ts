import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from './device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('device_commands')
export class DeviceCommand extends BaseEntity {
  @ManyToOne(() => Device, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  commandType: string;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: 'PENDING' | 'SENT' | 'ACKED' | 'FAILED';

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  acknowledgedAt?: Date;
}

