import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { NotificationType } from './entities/notification-setting.entity';
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

  @Post('display')
  @ApiOperation({ summary: '디스플레이 설정 업데이트' })
  async updateDisplaySettings(
    @CurrentUser() user: User,
    @Body() payload: { displayCharacter?: boolean; useMonochromeDisplay?: boolean },
  ) {
    const settings: UpdateUserSettingsDto['settings'] = [];

    if (payload.displayCharacter !== undefined) {
      settings.push({
        key: 'display.character',
        value: payload.displayCharacter ? 'true' : 'false',
      });
    }

    if (payload.useMonochromeDisplay !== undefined) {
      settings.push({
        key: 'display.monochrome',
        value: payload.useMonochromeDisplay ? 'true' : 'false',
      });
    }

    if (settings.length === 0) {
      return {
        success: true,
        data: await this.settingsService.listUserSettings(user),
      };
    }

    const result = await this.settingsService.updateUserSettings(user, { settings });
    return {
      success: true,
      data: result,
    };
  }

  @Post('alerts')
  @ApiOperation({ summary: '알림 설정 업데이트' })
  async updateAlertSettings(
    @CurrentUser() user: User,
    @Body() payload: {
      dialogueAlertsEnabled?: boolean;
      cleaningAlertsEnabled?: boolean;
      sensorAlertsEnabled?: boolean;
    },
  ) {
    const preferences: UpdateNotificationSettingsDto['preferences'] = [];

    if (payload.dialogueAlertsEnabled !== undefined) {
      preferences.push({
        type: NotificationType.StateAlert,
        isEnabled: payload.dialogueAlertsEnabled,
      });
    }

    if (payload.cleaningAlertsEnabled !== undefined) {
      preferences.push({
        type: NotificationType.Cleaning,
        isEnabled: payload.cleaningAlertsEnabled,
      });
    }

    if (payload.sensorAlertsEnabled !== undefined) {
      preferences.push({
        type: NotificationType.StateAlert,
        isEnabled: payload.sensorAlertsEnabled,
      });
    }

    if (preferences.length === 0) {
      return {
        success: true,
        data: await this.settingsService.listNotificationSettings(user),
      };
    }

    const result = await this.settingsService.updateNotificationSettings(user, { preferences });
    return {
      success: true,
      data: result,
    };
  }
}

