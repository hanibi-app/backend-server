import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';

export type TimeseriesPeriod = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

@Entity('timeseries_stats')
export class TimeseriesStats extends BaseEntity {
  @ManyToOne(() => Device, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'varchar', length: 20 })
  periodType: TimeseriesPeriod;

  @Column()
  periodStart: Date;

  @Column()
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgBodyTemperature?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgMoistureCondition?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgFeedAmount?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgFragranceIndex?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgLifeScore?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  maxLifeScore?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  minLifeScore?: number;

  @Column({ type: 'int', nullable: true })
  dataCount?: number;

  @Column({ type: 'int', nullable: true })
  processingCount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalProcessedAmount?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgProcessingTime?: number;
}

