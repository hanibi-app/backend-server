import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueNames } from '../queue.constants';

export interface CharacterStateJob {
  deviceId: string;
  stateRuleId?: string;
  triggeredAt: string;
}

@Injectable()
export class CharacterQueueProducer {
  private readonly logger = new Logger(CharacterQueueProducer.name);

  constructor(
    @InjectQueue(QueueNames.CharacterState)
    private readonly queue: Queue<CharacterStateJob>,
  ) {}

  async enqueueCharacterState(job: CharacterStateJob): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.queue.add('character-state', job, { removeOnComplete: true });
    this.logger.debug(`캐릭터 상태 큐 등록: deviceId=${job.deviceId}`);
  }
}

