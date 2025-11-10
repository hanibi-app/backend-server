import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface NotificationPayload {
  userId: string;
  notificationId: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`알림 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`알림 해제: ${client.id}`);
  }

  @SubscribeMessage('subscribeUser')
  handleSubscribeUser(client: Socket, @MessageBody() payload: { userId: string }): void {
    client.join(`user:${payload.userId}`);
    this.logger.debug(`클라이언트 ${client.id} -> user:${payload.userId} 알림 구독`);
  }

  broadcastNotification(payload: NotificationPayload): void {
    this.server.to(`user:${payload.userId}`).emit('notification', payload);
  }
}

