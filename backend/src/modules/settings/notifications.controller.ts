import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('history')
  @ApiOperation({ summary: '알림 히스토리 조회' })
  async getHistory(@CurrentUser() user: User, @Query('limit') limit = 20) {
    const history = await this.notificationsService.listHistory(user, Number(limit) || 20);
    return {
      success: true,
      data: history,
    };
  }
}

