import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { DeviceCommandType } from '../modules/devices/enums/device-command-type.enum';
import { Device, DeviceStatus } from '../modules/devices/entities/device.entity';
import { DeviceCommand } from '../modules/devices/entities/device-command.entity';
import { DeviceCommandJob } from '../queues/producers/device-command-queue.producer';
import { QueueNames } from '../queues/queue.constants';

@Processor(QueueNames.DeviceControl)
@Injectable()
export class DeviceControlProcessor extends WorkerHost {
  private readonly logger = new Logger(DeviceControlProcessor.name);

  constructor(
    @InjectRepository(DeviceCommand)
    private readonly deviceCommandRepository: Repository<DeviceCommand>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {
    super();
  }

  async process(job: Job<DeviceCommandJob>): Promise<void> {
    this.logger.debug(
      `기기 제어 처리: deviceId=${job.data.deviceId}, command=${job.data.commandType}`,
    );
    const command = await this.deviceCommandRepository.findOne({
      where: { id: job.data.commandId },
      relations: ['device'],
    });

    if (!command) {
      this.logger.warn(`명령을 찾을 수 없습니다. commandId=${job.data.commandId}`);
      return;
    }

    command.status = 'SENT';
    command.sentAt = new Date();
    await this.deviceCommandRepository.save(command);

    const device = command.device;
    if (!device) {
      this.logger.warn(`명령의 기기 정보가 없습니다. commandId=${command.id}`);
      return;
    }

    this.applyDeviceSideEffects(device, job.data);
    await this.deviceRepository.save(device);

    command.status = 'ACKED';
    command.acknowledgedAt = new Date();
    await this.deviceCommandRepository.save(command);
  }

  private applyDeviceSideEffects(device: Device, job: DeviceCommandJob) {
    switch (job.commandType) {
      case DeviceCommandType.Start:
      case DeviceCommandType.Resume:
        device.deviceStatus = DeviceStatus.Processing;
        break;
      case DeviceCommandType.Stop:
        device.deviceStatus = DeviceStatus.Idle;
        break;
      case DeviceCommandType.Pause:
        device.deviceStatus = DeviceStatus.Processing;
        break;
      case DeviceCommandType.SetTemperature:
        device.deviceConfig = {
          ...(device.deviceConfig ?? {}),
          targetTemperature: job.payload?.temperature ?? job.payload,
        };
        break;
      case DeviceCommandType.UpdateInterval:
        device.deviceConfig = {
          ...(device.deviceConfig ?? {}),
          dataInterval: job.payload?.intervalSeconds ?? job.payload,
        };
        break;
      default:
        break;
    }
    device.lastHeartbeat = new Date();
  }
}

