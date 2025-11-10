import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum SensorRequestStatus {
  Success = 'SUCCESS',
  ValidationFailed = 'VALIDATION_FAILED',
  Error = 'ERROR',
}

@Entity('sensor_request_logs')
export class SensorRequestLog extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'text' })
  rawRequest: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SensorRequestStatus.Success,
  })
  status: SensorRequestStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'int', nullable: true })
  httpStatus?: number;

  @Column({ type: 'int', nullable: true })
  responseTimeMs?: number;
}

