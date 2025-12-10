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

  async executeQuickCommand(user: User, deviceId: string, commandId: string): Promise<{
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
  }> {
    const command = await this.quickCommandRepository.findOne({ where: { id: commandId, isActive: true } });
    if (!command) {
      throw new NotFoundException('빠른 명령을 찾을 수 없습니다.');
    }

    const device = await this.devicesService.findOneByUser(user.id, deviceId);

    // 1. 사용자 메시지 저장
    const userMessage = await this.sendMessage({
      user,
      deviceId,
      role: 'user',
      content: command.label,
      metadata: { command: command.action, payload: command.payload },
    });

    // 2. 명령 실행
    const commandResult = await this.executeCommandAction(user, device, command);

    // 3. assistant 응답 메시지 생성
    const responseText = this.getCommandResponse(command.action, commandResult);
    const assistantMessage = await this.createMessage(
      device,
      undefined,
      'assistant',
      responseText,
      { commandId: command.id, action: command.action, result: commandResult }
    );

    return { userMessage, assistantMessage };
  }

  private getCommandResponse(action: string, result?: Record<string, any>): string {
    const [namespace, cmd] = action.split(':');
    
    // 디바이스 제어 명령 응답
    if (namespace === 'device') {
      const deviceResponses: Record<string, string> = {
        'start': '처리를 시작합니다! 열심히 일해볼게요 💪',
        'stop': '처리를 중지했어요. 잠시 쉴게요 😴',
        'pause': '일시 정지했어요. 다시 부르면 바로 시작할게요!',
        'resume': '다시 시작합니다! 열심히 해볼게요 💨',
        'set_temperature': result?.temperature 
          ? `온도를 ${result.temperature}°C로 설정했어요! 🌡️` 
          : '온도를 설정했어요!',
        'update_interval': '업데이트 간격을 변경했어요!',
      };
      return deviceResponses[cmd] ?? '명령을 처리했어요!';
    }
    
    // 조회 명령 응답
    if (namespace === 'query') {
      const queryResponses: Record<string, string> = {
        'status': '현재 상태를 확인하고 있어요... 📊',
        'today_stats': '오늘 처리량을 확인해볼게요! 📈',
        'weekly_report': '이번 주 리포트를 준비하고 있어요! 📋',
        'help': '무엇을 도와드릴까요? 저는 음식물 처리를 도와주는 하니비예요! 🌱',
        'eco_tips': '환경을 위한 팁을 알려드릴게요! 🌍\n\n1. 음식물 쓰레기를 줄이면 온실가스 배출을 줄일 수 있어요\n2. 처리된 음식물은 좋은 퇴비가 돼요\n3. 매일 조금씩 실천하면 큰 변화가 생겨요!',
      };
      return queryResponses[cmd] ?? '확인하고 있어요!';
    }
    
    return '명령을 처리했어요! ✨';
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

  private async executeCommandAction(user: User, device: Device, command: QuickCommand): Promise<Record<string, any> | undefined> {
    if (!command.action) {
      return undefined;
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
          return { action: 'start' };
        case 'stop':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Stop,
            payload: command.payload ?? undefined,
          });
          return { action: 'stop' };
        case 'pause':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Pause,
            payload: command.payload ?? undefined,
          });
          return { action: 'pause' };
        case 'resume':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.Resume,
            payload: command.payload ?? undefined,
          });
          return { action: 'resume' };
        case 'set_temperature':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.SetTemperature,
            payload: command.payload ?? undefined,
          });
          return { action: 'set_temperature', temperature: command.payload?.temperature };
        case 'update_interval':
          await this.devicesService.sendCommand({
            device,
            user,
            commandType: DeviceCommandType.UpdateInterval,
            payload: command.payload ?? undefined,
          });
          return { action: 'update_interval' };
        default:
          break;
      }
    }
    
    // query 명령은 실제 조회 로직 없이 응답만 반환 (추후 확장 가능)
    if (namespace === 'query') {
      return { action, query: true };
    }
    
    return undefined;
  }
}

