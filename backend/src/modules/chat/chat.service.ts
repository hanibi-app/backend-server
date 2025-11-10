import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatGateway } from '../../realtime/gateways/chat.gateway';
import { DeviceCommandType } from '../devices/enums/device-command-type.enum';
import { Device } from '../devices/entities/device.entity';
import { DevicesService } from '../devices/devices.service';
import { User } from '../users/entities/user.entity';
import { ChatMessage, ChatRole } from './entities/chat-message.entity';
import { QuickCommand } from './entities/quick-command.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(QuickCommand)
    private readonly quickCommandRepository: Repository<QuickCommand>,
    private readonly devicesService: DevicesService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async sendMessage(params: {
    user: User;
    deviceId: string;
    role: ChatRole;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<ChatMessage> {
    const device = await this.devicesService.findOneByUser(params.user.id, params.deviceId);
    return this.createMessage(device, params.user, params.role, params.content, params.metadata);
  }

  async createSystemMessage(device: Device, content: string, metadata?: Record<string, any>) {
    return this.createMessage(device, undefined, 'system', content, metadata);
  }

  async listMessages(user: User, deviceId: string, limit = 50): Promise<ChatMessage[]> {
    const device = await this.devicesService.findOneByUser(user.id, deviceId);
    return this.chatMessageRepository.find({
      where: { device: { id: device.id } },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user', 'device'],
    });
  }

  async listQuickCommands(): Promise<QuickCommand[]> {
    return this.quickCommandRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async executeQuickCommand(user: User, deviceId: string, commandId: string): Promise<ChatMessage> {
    const command = await this.quickCommandRepository.findOne({ where: { id: commandId, isActive: true } });
    if (!command) {
      throw new NotFoundException('빠른 명령을 찾을 수 없습니다.');
    }

    const device = await this.devicesService.findOneByUser(user.id, deviceId);

    const message = await this.sendMessage({
      user,
      deviceId,
      role: 'user',
      content: command.label,
      metadata: { command: command.action, payload: command.payload },
    });

    await this.executeCommandAction(user, device, command);

    return message;
  }

  private async createMessage(
    device: Device,
    user: User | undefined,
    role: ChatRole,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<ChatMessage> {
    const entity = this.chatMessageRepository.create({
      device,
      user,
      role,
      content,
      metadata,
    });
    const saved = await this.chatMessageRepository.save(entity);

    this.chatGateway.broadcastMessage({
      deviceId: device.deviceId,
      messageId: saved.id,
      role,
      content,
      createdAt: saved.createdAt.toISOString(),
    });

    return saved;
  }

  private async executeCommandAction(user: User, device: Device, command: QuickCommand): Promise<void> {
    if (!command.action) {
      return;
    }

    const [namespace, action] = command.action.split(':');
    if (namespace === 'device') {
      switch (action) {
        case 'start':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Start,
            payload: command.payload ?? undefined,
          });
          break;
        case 'stop':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Stop,
            payload: command.payload ?? undefined,
          });
          break;
        case 'pause':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Pause,
            payload: command.payload ?? undefined,
          });
          break;
        case 'resume':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Resume,
            payload: command.payload ?? undefined,
          });
          break;
        case 'set_temperature':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.SetTemperature,
            payload: command.payload ?? undefined,
          });
          break;
        case 'update_interval':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.UpdateInterval,
            payload: command.payload ?? undefined,
          });
          break;
        default:
          break;
      }
    }
  }
}

