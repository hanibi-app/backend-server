import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';

export enum ProcessingSessionStatus {
  Started = 'STARTED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Interrupted = 'INTERRUPTED',
}

@Entity('processing_sessions')
export class ProcessingSession extends BaseEntity {
  @ManyToOne(() => Device, (device) => device.processingSessions, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  initialWeight?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalWeight?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  processedAmount?: number;

  @Column({ type: 'varchar', length: 20, default: ProcessingSessionStatus.Started })
  sessionStatus: ProcessingSessionStatus;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgTemperature?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgHumidity?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  energyConsumed?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  efficiencyScore?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}

