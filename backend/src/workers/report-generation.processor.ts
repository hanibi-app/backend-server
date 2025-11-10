import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ChatService } from '../modules/chat/chat.service';
import { ProcessingSession } from '../modules/processing/entities/processing-session.entity';
import { ReportsService } from '../modules/reports/services/reports.service';
import { NotificationsService } from '../modules/settings/notifications.service';
import { NotificationType } from '../modules/settings/entities/notification-setting.entity';
import { QueueNames } from '../queues/queue.constants';
import { ReportGenerationJob } from '../queues/producers/report-queue.producer';

@Processor(QueueNames.ReportGeneration)
export class ReportGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationProcessor.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    @InjectRepository(ProcessingSession)
    private readonly sessionRepository: Repository<ProcessingSession>,
  ) {
    super();
  }

  async process(job: Job<ReportGenerationJob>): Promise<void> {
    this.logger.debug(
      `리포트 생성 작업: userId=${job.data.userId}, sessionId=${job.data.sessionId}`,
    );
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: job.data.sessionId },
        relations: ['device', 'device.user'],
      });

      if (!session || !session.device || !session.device.user) {
        this.logger.warn(`세션 또는 사용자 정보를 찾을 수 없습니다. sessionId=${job.data.sessionId}`);
        return;
      }

      const result = await this.reportsService.calculateEcoScoreForSession(session.id);

      const message = `처리 완료! 환경경 점수는 ${result.score}점입니다. CO₂ 절약량 ${result.components.co2Savings}kg`;
      await this.chatService.createSystemMessage(session.device, message, {
        score: result.score,
        co2Savings: result.components.co2Savings,
        processedAmount: result.components.processedAmount,
      });

      await this.notificationsService.logNotification({
        userId: session.device.user.id,
        deviceId: session.device.id,
        type: NotificationType.WeeklyReport,
        title: '환경경 점수 업데이트',
        message,
      });
    } catch (error) {
      this.logger.error(`리포트 생성 실패: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }
}

