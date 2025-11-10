import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { DeviceCommandQueueProducer } from '../../queues/producers/device-command-queue.producer';
import { DeviceCommandType } from './enums/device-command-type.enum';
import { PairDeviceDto } from './dto/pair-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceCommand } from './entities/device-command.entity';
import { Device, DeviceConnectionStatus } from './entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly devicesRepository: Repository<Device>,
    @InjectRepository(DeviceCommand)
    private readonly deviceCommandRepository: Repository<DeviceCommand>,
    private readonly deviceCommandQueue: DeviceCommandQueueProducer,
  ) {}

  async pairDevice(user: User, payload: PairDeviceDto): Promise<Device> {
    let device = await this.devicesRepository.findOne({
      where: { deviceId: payload.deviceId },
      relations: ['user'],
    });

    if (device && device.user && device.user.id !== user.id) {
      throw new ConflictException('이미 다른 사용자에 등록된 기기입니다.');
    }

    if (!device) {
      device = this.devicesRepository.create({
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        user,
        connectionStatus: DeviceConnectionStatus.Offline,
      });
    } else {
      device.user = user;
      device.deviceName = payload.deviceName ?? device.deviceName;
    }

    return this.devicesRepository.save(device);
  }

  async findByDeviceId(deviceId: string): Promise<Device | null> {
    return this.devicesRepository.findOne({ where: { deviceId } });
  }

  async findByDeviceIdWithUser(deviceId: string): Promise<Device | null> {
    return this.devicesRepository.findOne({
      where: { deviceId },
      relations: ['user'],
    });
  }

  async findOrCreateByDeviceId(deviceId: string): Promise<Device> {
    let device = await this.findByDeviceIdWithUser(deviceId);
    if (!device) {
      device = this.devicesRepository.create({
        deviceId,
        connectionStatus: DeviceConnectionStatus.Offline,
      });
      await this.devicesRepository.save(device);
      device = await this.findByDeviceIdWithUser(deviceId);
    }
    if (!device) {
      throw new NotFoundException('기기를 생성할 수 없습니다.');
    }
    return device;
  }

  async findAllByUser(userId: string): Promise<Device[]> {
    return this.devicesRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });
  }

  async findOneByUser(userId: string, deviceId: string): Promise<Device> {
    const device = await this.devicesRepository.findOne({
      where: {
        deviceId,
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!device) {
      throw new NotFoundException('기기를 찾을 수 없습니다.');
    }

    return device;
  }

  async updateDevice(deviceId: string, payload: UpdateDeviceDto): Promise<Device> {
    const device = await this.devicesRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('기기를 찾을 수 없습니다.');
    }

    Object.assign(device, payload);
    return this.devicesRepository.save(device);
  }

  async sendCommand(params: {
    device: Device;
    user: User;
    commandType: DeviceCommandType;
    payload?: Record<string, any>;
  }): Promise<DeviceCommand> {
    const command = this.deviceCommandRepository.create({
      device: params.device,
      user: params.user,
      commandType: params.commandType,
      payload: params.payload,
      status: 'PENDING',
    });
    const saved = await this.deviceCommandRepository.save(command);

    await this.deviceCommandQueue.enqueueCommand({
      commandId: saved.id,
      deviceId: params.device.deviceId,
      commandType: params.commandType,
      payload: params.payload,
      requestedBy: params.user.id,
      requestedAt: new Date().toISOString(),
    });

    return saved;
  }

  async listCommands(deviceId: string, limit = 20): Promise<DeviceCommand[]> {
    return this.deviceCommandRepository.find({
      where: {
        device: { deviceId },
      },
      relations: ['device', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async listPendingCommands(deviceId: string): Promise<DeviceCommand[]> {
    return this.deviceCommandRepository.find({
      where: {
        device: { deviceId },
        status: In(['PENDING', 'SENT']),
      },
      relations: ['device', 'user'],
      order: { createdAt: 'ASC' },
    });
  }

  async acknowledgeCommand(deviceId: string, commandId: string, status: 'ACKED' | 'FAILED'): Promise<DeviceCommand> {
    const command = await this.deviceCommandRepository.findOne({
      where: { id: commandId, device: { deviceId } },
      relations: ['device'],
    });

    if (!command) {
      throw new NotFoundException('명령을 찾을 수 없습니다.');
    }

    command.status = status;
    command.acknowledgedAt = new Date();
    return this.deviceCommandRepository.save(command);
  }
}

