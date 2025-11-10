import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharacterController } from './character.controller';
import { CharacterService } from './character.service';
import { AttributeOption } from './entities/attribute-option.entity';
import { CharacterAttribute } from './entities/character-attribute.entity';
import { CharacterStateHistory } from './entities/character-state-history.entity';
import { CharacterStateRule } from './entities/character-state-rule.entity';
import { UserCharacter } from './entities/user-character.entity';
import { UserCharacterAttribute } from './entities/user-character-attribute.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CharacterAttribute,
      AttributeOption,
      UserCharacter,
      UserCharacterAttribute,
      CharacterStateRule,
      CharacterStateHistory,
    ]),
  ],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService],
})
export class CharacterModule {}

