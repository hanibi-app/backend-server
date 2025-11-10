import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProcessingSession } from '../../processing/entities/processing-session.entity';
import { SensorData } from '../../sensors/entities/sensor-data.entity';
import { User } from '../../users/entities/user.entity';

export enum DeviceConnectionStatus {
  Online = 'ONLINE',
  Offline = 'OFFLINE',
  Error = 'ERROR',
}

export enum DeviceStatus {
  Idle = 'IDLE',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Error = 'ERROR',
}

@Entity('devices')
export class Device extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  deviceId: string;

  @ManyToOne(() => User, (user) => user.devices, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceName?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  wifiSsid?: string;

  @Column({ type: 'varchar', length: 20, default: DeviceConnectionStatus.Offline })
  connectionStatus: DeviceConnectionStatus;

  @Column({ type: 'varchar', length: 20, default: DeviceStatus.Idle })
  deviceStatus: DeviceStatus;

  @Column({ nullable: true })
  lastHeartbeat?: Date;

  @Column({ type: 'simple-json', nullable: true })
  deviceConfig?: Record<string, any>;

  @OneToMany(() => SensorData, (data) => data.device)
  sensorData: SensorData[];

  @OneToMany(() => ProcessingSession, (session) => session.device)
  processingSessions: ProcessingSession[];
}

