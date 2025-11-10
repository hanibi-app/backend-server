import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtimeModule } from '../../realtime/realtime.module';
import { DevicesModule } from '../devices/devices.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { QuickCommand } from './entities/quick-command.entity';

@Module({
  imports: [DevicesModule, RealtimeModule, TypeOrmModule.forFeature([ChatMessage, QuickCommand])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

