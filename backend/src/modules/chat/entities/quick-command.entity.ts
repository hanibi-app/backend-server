import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('quick_commands')
export class QuickCommand extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

