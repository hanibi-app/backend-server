import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueNames } from '../queue.constants';

export interface ReportGenerationJob {
  userId: string;
  sessionId: string;
  generatedAt: string;
}

@Injectable()
export class ReportQueueProducer {
  private readonly logger = new Logger(ReportQueueProducer.name);

  constructor(
    @InjectQueue(QueueNames.ReportGeneration)
    private readonly queue: Queue<ReportGenerationJob>,
  ) {}

  async enqueueReport(job: ReportGenerationJob): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.queue.add('generate-report', job, { removeOnComplete: true });
    this.logger.debug(`리포트 생성 큐 등록: userId=${job.userId}, sessionId=${job.sessionId}`);
  }
}

