import { Exclude } from 'class-transformer';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];
}

