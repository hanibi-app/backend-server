import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

export type ChatRole = 'system' | 'user' | 'assistant';

@Entity('chat_messages')
export class ChatMessage extends BaseEntity {
  @ManyToOne(() => Device, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 20 })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;
}

