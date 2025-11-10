import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';
import { CharacterStateRule } from './character-state-rule.entity';

@Entity('character_state_history')
export class CharacterStateHistory extends BaseEntity {
  @ManyToOne(() => Device, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @ManyToOne(() => CharacterStateRule, { nullable: true })
  @JoinColumn({ name: 'state_rule_id' })
  stateRule?: CharacterStateRule;

  @Column({ type: 'varchar', length: 100 })
  currentState: string;

  @Column({ type: 'text', nullable: true })
  displayedMessage?: string;

  @Column({ type: 'simple-json', nullable: true })
  triggerSensorData?: Record<string, any>;

  @Column()
  stateChangedAt: Date;
}

