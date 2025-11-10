import { Module } from '@nestjs/common';
import { ChatGateway } from './gateways/chat.gateway';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { SensorsGateway } from './gateways/sensors.gateway';

@Module({
  providers: [SensorsGateway, ChatGateway, NotificationsGateway],
  exports: [SensorsGateway, ChatGateway, NotificationsGateway],
})
export class RealtimeModule {}

