import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CharacterService } from './character.service';
import { UpdateCharacterDto } from './dto/update-character.dto';

@ApiTags('Character')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'character',
  version: '1',
})
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get('attributes')
  @ApiOperation({ summary: '캐릭터 특성 및 옵션 목록' })
  async listAttributes() {
    const attributes = await this.characterService.getAttributes();
    return {
      success: true,
      data: attributes,
    };
  }

  @Get('me')
  @ApiOperation({ summary: '내 캐릭터 조회' })
  async getMyCharacter(@CurrentUser() user: User) {
    const character = await this.characterService.getCurrentCharacter(user);
    return {
      success: true,
      data: character,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: '내 캐릭터 설정' })
  async updateCharacter(@CurrentUser() user: User, @Body() payload: UpdateCharacterDto) {
    const character = await this.characterService.updateCharacter(user, payload);
    return {
      success: true,
      data: character,
    };
  }

  @Get('state-rules')
  @ApiOperation({ summary: '캐릭터 상태 룰 목록' })
  async getStateRules() {
    const rules = await this.characterService.listActiveStateRules();
    return {
      success: true,
      data: rules,
    };
  }

  @Get('state-history/:deviceId')
  @ApiOperation({ summary: '기기별 캐릭터 상태 이력' })
  async getStateHistory(@Param('deviceId') deviceId: string) {
    const history = await this.characterService.listStateHistory(deviceId);
    return {
      success: true,
      data: history,
    };
  }
}

