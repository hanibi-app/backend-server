import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueNames } from '../queues/queue.constants';
import { CharacterStateJob } from '../queues/producers/character-queue.producer';

@Processor(QueueNames.CharacterState)
export class CharacterStateProcessor extends WorkerHost {
  private readonly logger = new Logger(CharacterStateProcessor.name);

  async process(job: Job<CharacterStateJob>): Promise<void> {
    this.logger.debug(
      `캐릭터 상태 업데이트: deviceId=${job.data.deviceId}, stateRuleId=${job.data.stateRuleId}`,
    );
    // TODO: Evaluate character emotion and notify realtime gateway
  }
}

