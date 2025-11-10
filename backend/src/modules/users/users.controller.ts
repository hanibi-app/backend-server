import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UseGuards } from '@nestjs/common';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  async getProfile(@CurrentUser() user: User) {
    return {
      success: true,
      data: user,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: '내 프로필 수정' })
  async updateProfile(@CurrentUser() user: User, @Body() payload: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.id, payload);
    return {
      success: true,
      data: updated,
    };
  }
}

