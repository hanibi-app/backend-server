import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { UserCharacterAttribute } from './user-character-attribute.entity';

@Entity('user_character')
export class UserCharacter extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  characterName: string;

  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @OneToMany(() => UserCharacterAttribute, (attr) => attr.userCharacter, {
    cascade: true,
  })
  attributes: UserCharacterAttribute[];
}

