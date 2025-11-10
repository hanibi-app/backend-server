import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DeviceCommandType } from '../../modules/devices/enums/device-command-type.enum';
import { QueueNames } from '../queue.constants';

export interface DeviceCommandJob {
  commandId: string;
  deviceId: string;
  commandType: DeviceCommandType;
  payload?: Record<string, any>;
  requestedBy: string;
  requestedAt: string;
}

@Injectable()
export class DeviceCommandQueueProducer {
  private readonly logger = new Logger(DeviceCommandQueueProducer.name);

  constructor(
    @InjectQueue(QueueNames.DeviceControl)
    private readonly queue: Queue<DeviceCommandJob>,
  ) {}

  async enqueueCommand(job: DeviceCommandJob): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.queue.add('device-command', job, { removeOnComplete: true });
    this.logger.debug(`기기 제어 큐 등록: deviceId=${job.deviceId}, command=${job.commandType}`);
  }
}

