import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QueueNames } from '../queues/queue.constants';
import { SensorProcessingJob } from '../queues/producers/sensor-queue.producer';

@Processor(QueueNames.SensorProcessing)
export class SensorProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(SensorProcessingProcessor.name);

  async process(job: Job<SensorProcessingJob>): Promise<void> {
    this.logger.debug(
      `센서 데이터 처리: deviceId=${job.data.deviceId}, measuredAt=${job.data.measuredAt}`,
    );
    // TODO: Implement advanced analytics, anomaly detection, etc.
  }
}

