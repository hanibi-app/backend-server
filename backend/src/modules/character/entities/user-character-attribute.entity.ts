import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AttributeOption } from './attribute-option.entity';
import { UserCharacter } from './user-character.entity';

@Entity('user_character_attributes')
export class UserCharacterAttribute extends BaseEntity {
  @ManyToOne(() => UserCharacter, (character) => character.attributes, { nullable: false })
  @JoinColumn({ name: 'user_character_id' })
  userCharacter: UserCharacter;

  @ManyToOne(() => AttributeOption, { nullable: false })
  @JoinColumn({ name: 'attribute_option_id' })
  attributeOption: AttributeOption;
}

