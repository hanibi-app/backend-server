import { Module } from '@nestjs/common';
import { ChatGateway } from './gateways/chat.gateway';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { SensorsGateway } from './gateways/sensors.gateway';
import { CameraStreamGateway } from './gateways/camera-stream.gateway';
import { CameraModule } from '../modules/camera/camera.module';

@Module({
  imports: [CameraModule],
  providers: [SensorsGateway, ChatGateway, NotificationsGateway, CameraStreamGateway],
  exports: [SensorsGateway, ChatGateway, NotificationsGateway, CameraStreamGateway],
})
export class RealtimeModule {}

