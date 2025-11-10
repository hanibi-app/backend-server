import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';
import { ProcessingSession } from '../../processing/entities/processing-session.entity';

@Entity('sensor_data')
export class SensorData extends BaseEntity {
  @ManyToOne(() => Device, (device) => device.sensorData, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @ManyToOne(() => ProcessingSession, { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: ProcessingSession;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  temperature?: number;

  @Column({ type: 'int', nullable: true })
  humidity?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  gas?: number;

  @Column({ type: 'int', nullable: true })
  error?: number;

  @Column({ type: 'simple-json', nullable: true })
  rawSensorData?: Record<string, any>;

  @Column()
  measuredAt: Date;
}

