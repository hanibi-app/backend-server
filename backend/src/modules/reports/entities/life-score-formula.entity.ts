import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('life_score_formula')
export class LifeScoreFormula extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  formulaName: string;

  @Column({ type: 'text', nullable: true })
  formulaDescription?: string;

  @Column({ type: 'simple-json', nullable: true })
  formulaConfig?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  formulaCode?: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;
}

