import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CharacterAttribute } from './character-attribute.entity';

@Entity('attribute_options')
export class AttributeOption extends BaseEntity {
  @ManyToOne(() => CharacterAttribute, (attribute) => attribute.options, { nullable: false })
  @JoinColumn({ name: 'attribute_id' })
  attribute: CharacterAttribute;

  @Column({ type: 'varchar', length: 100 })
  optionValue: string;

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

