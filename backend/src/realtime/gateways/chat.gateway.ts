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

interface ChatMessagePayload {
  deviceId: string;
  messageId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`채팅 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`채팅 해제: ${client.id}`);
  }

  @SubscribeMessage('joinChannel')
  handleJoinChannel(client: Socket, @MessageBody() payload: { deviceId: string }): void {
    client.join(`chat:${payload.deviceId}`);
    this.logger.debug(`클라이언트 ${client.id} -> chat:${payload.deviceId} 입장`);
  }

  broadcastMessage(payload: ChatMessagePayload): void {
    this.server.to(`chat:${payload.deviceId}`).emit('chatMessage', payload);
  }
}

