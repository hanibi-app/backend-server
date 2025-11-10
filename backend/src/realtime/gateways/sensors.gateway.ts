import {
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface SensorBroadcastPayload {
  deviceId: string;
  measuredAt: string;
  metrics: {
    temperature: number | null;
    humidity: number | null;
    weight?: number | null;
    gas?: number | null;
  };
}

@WebSocketGateway({
  namespace: 'sensors',
  cors: {
    origin: '*',
  },
})
export class SensorsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(SensorsGateway.name);

  onModuleInit(): void {
    this.logger.log('SensorsGateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`클라이언트 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`클라이언트 해제: ${client.id}`);
  }

  @SubscribeMessage('subscribeDevice')
  handleSubscribeDevice(client: Socket, @MessageBody() payload: { deviceId: string }): void {
    client.join(`device:${payload.deviceId}`);
    this.logger.debug(`클라이언트 ${client.id} -> device:${payload.deviceId} 구독`);
  }

  @SubscribeMessage('unsubscribeDevice')
  handleUnsubscribeDevice(client: Socket, @MessageBody() payload: { deviceId: string }): void {
    client.leave(`device:${payload.deviceId}`);
    this.logger.debug(`클라이언트 ${client.id} -> device:${payload.deviceId} 구독 해제`);
  }

  broadcastSensorUpdate(payload: SensorBroadcastPayload): void {
    this.server.to(`device:${payload.deviceId}`).emit('sensorUpdate', payload);
  }
}

