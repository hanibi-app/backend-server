import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueNames } from '../queue.constants';

export interface SensorProcessingJob {
  deviceId: string;
  measuredAt: string;
  metrics: {
    temperature: number | null;
    humidity: number | null;
    weight?: number | null;
    gas?: number | null;
  };
}

@Injectable()
export class SensorQueueProducer {
  private readonly logger = new Logger(SensorQueueProducer.name);

  constructor(
    @InjectQueue(QueueNames.SensorProcessing)
    private readonly queue: Queue<SensorProcessingJob>,
  ) {}

  async enqueueSensorData(job: SensorProcessingJob): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.queue.add('sensor-data', job, {
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.debug(`센서 데이터 큐 등록: deviceId=${job.deviceId}`);
  }
}

