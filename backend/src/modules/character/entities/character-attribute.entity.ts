import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AttributeOption } from './attribute-option.entity';

@Entity('character_attributes')
export class CharacterAttribute extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  attributeName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => AttributeOption, (option) => option.attribute)
  options: AttributeOption[];
}

