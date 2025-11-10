import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AttributeOption } from './entities/attribute-option.entity';
import { CharacterAttribute } from './entities/character-attribute.entity';
import { CharacterStateHistory } from './entities/character-state-history.entity';
import { CharacterStateRule } from './entities/character-state-rule.entity';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { UserCharacter } from './entities/user-character.entity';
import { UserCharacterAttribute } from './entities/user-character-attribute.entity';

@Injectable()
export class CharacterService {
  constructor(
    @InjectRepository(CharacterAttribute)
    private readonly attributeRepository: Repository<CharacterAttribute>,
    @InjectRepository(AttributeOption)
    private readonly optionRepository: Repository<AttributeOption>,
    @InjectRepository(UserCharacter)
    private readonly userCharacterRepository: Repository<UserCharacter>,
    @InjectRepository(UserCharacterAttribute)
    private readonly userCharacterAttributeRepository: Repository<UserCharacterAttribute>,
    @InjectRepository(CharacterStateRule)
    private readonly stateRuleRepository: Repository<CharacterStateRule>,
    @InjectRepository(CharacterStateHistory)
    private readonly stateHistoryRepository: Repository<CharacterStateHistory>,
  ) {}

  async getAttributes(): Promise<CharacterAttribute[]> {
    return this.attributeRepository.find({
      where: { isActive: true },
      relations: ['options'],
      order: {
        sortOrder: 'ASC',
        options: {
          sortOrder: 'ASC',
        },
      },
    });
  }

  async getCurrentCharacter(user: User): Promise<UserCharacter | null> {
    return this.userCharacterRepository.findOne({
      where: {
        user: { id: user.id },
        isCurrent: true,
      },
      relations: ['attributes', 'attributes.attributeOption', 'attributes.attributeOption.attribute'],
    });
  }

  async updateCharacter(user: User, payload: UpdateCharacterDto): Promise<UserCharacter> {
    const options = await this.optionRepository.find({
      where: {
        id: In(payload.attributeOptionIds),
        isActive: true,
      },
      relations: ['attribute'],
    });

    if (!options.length) {
      throw new NotFoundException('선택한 옵션을 찾을 수 없습니다.');
    }

    const optionMap = new Map<string, AttributeOption>();
    for (const option of options) {
      optionMap.set(option.attribute.id, option);
    }

    let character = await this.getCurrentCharacter(user);

    if (!character) {
      character = this.userCharacterRepository.create({
        user,
        characterName: payload.characterName,
        isCurrent: true,
      });
      character = await this.userCharacterRepository.save(character);
    } else {
      character.characterName = payload.characterName;
      if (payload.makeCurrent === true) {
        await this.userCharacterRepository
          .createQueryBuilder()
          .update(UserCharacter)
          .set({ isCurrent: false })
          .where('user_id = :userId', { userId: user.id })
          .execute();
        character.isCurrent = true;
      }
      await this.userCharacterRepository.save(character);

      await this.userCharacterAttributeRepository.delete({
        userCharacter: { id: character.id },
      });
    }

    const newAttributes = Array.from(optionMap.values()).map((option) =>
      this.userCharacterAttributeRepository.create({
        userCharacter: character,
        attributeOption: option,
      }),
    );
    await this.userCharacterAttributeRepository.save(newAttributes);

    character.attributes = newAttributes;
    return character;
  }

  async listStateHistory(deviceId: string, limit = 20): Promise<CharacterStateHistory[]> {
    return this.stateHistoryRepository.find({
      where: {
        device: { deviceId },
      },
      relations: ['stateRule', 'device'],
      order: {
        stateChangedAt: 'DESC',
      },
      take: limit,
    });
  }

  async listActiveStateRules(): Promise<CharacterStateRule[]> {
    return this.stateRuleRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }
}

