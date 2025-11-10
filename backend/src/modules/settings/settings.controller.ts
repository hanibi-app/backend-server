import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { NotificationsService } from './notifications.service';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'settings',
  version: '1',
})
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '사용자 설정 조회' })
  async getSettings(@CurrentUser() user: User) {
    const settings = await this.settingsService.listUserSettings(user);
    return {
      success: true,
      data: settings,
    };
  }

  @Patch()
  @ApiOperation({ summary: '사용자 설정 수정' })
  async updateSettings(@CurrentUser() user: User, @Body() payload: UpdateUserSettingsDto) {
    const settings = await this.settingsService.updateUserSettings(user, payload);
    return {
      success: true,
      data: settings,
    };
  }

  @Get('notifications')
  @ApiOperation({ summary: '알림 설정 조회' })
  async getNotificationSettings(@CurrentUser() user: User) {
    const settings = await this.settingsService.listNotificationSettings(user);
    return {
      success: true,
      data: settings,
    };
  }

  @Patch('notifications')
  @ApiOperation({ summary: '알림 설정 수정' })
  async updateNotificationSettings(
    @CurrentUser() user: User,
    @Body() payload: UpdateNotificationSettingsDto,
  ) {
    const settings = await this.settingsService.updateNotificationSettings(user, payload);
    return {
      success: true,
      data: settings,
    };
  }
}

