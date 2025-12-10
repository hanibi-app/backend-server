import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { SendChatDto } from './dto/send-chat.dto';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'chat',
  version: '1',
})
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':deviceId/messages')
  @ApiOperation({ summary: '기기별 대화 기록' })
  async listMessages(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Query('limit') limit = 50,
  ) {
    const messages = await this.chatService.listMessages(user, deviceId, Number(limit) || 50);
    return {
      success: true,
      data: messages,
    };
  }

  @Post(':deviceId/messages')
  @ApiOperation({ summary: '채팅 메시지 전송' })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() payload: SendChatDto,
  ) {
    const message = await this.chatService.sendMessage({
      user,
      deviceId,
      role: 'user',
      content: payload.content,
      metadata: payload.metadata,
    });
    return {
      success: true,
      data: message,
    };
  }

  @Get('quick-commands/list')
  @ApiOperation({ summary: '빠른 명령 목록' })
  async listQuickCommands() {
    const commands = await this.chatService.listQuickCommands();
    return {
      success: true,
      data: commands,
    };
  }

  @Post(':deviceId/quick-commands/:commandId')
  @ApiOperation({ summary: '빠른 명령 실행' })
  async executeQuickCommand(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Param('commandId') commandId: string,
  ) {
    const { userMessage, assistantMessage } = await this.chatService.executeQuickCommand(user, deviceId, commandId);
    return {
      success: true,
      data: {
        userMessage,
        assistantMessage,
      },
    };
  }
}

