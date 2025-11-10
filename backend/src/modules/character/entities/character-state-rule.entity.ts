import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('character_state_rules')
export class CharacterStateRule extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  stateName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  triggerConditions?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  messageTemplate?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emotionAnimation?: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

