import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TimeseriesService } from '../modules/reports/services/timeseries.service';
import { QueueNames } from '../queues/queue.constants';

interface TimeseriesAggregationJob {
  deviceId: string;
  range: 'hourly' | 'daily' | 'weekly';
  triggeredAt: string;
}

@Processor(QueueNames.TimeseriesAggregation)
export class TimeseriesAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(TimeseriesAggregationProcessor.name);

  constructor(private readonly timeseriesService: TimeseriesService) {
    super();
  }

  async process(job: Job<TimeseriesAggregationJob>): Promise<void> {
    this.logger.debug(
      `시계열 집계 작업: deviceId=${job.data.deviceId}, range=${job.data.range}`,
    );
    try {
      const triggeredAt = new Date(job.data.triggeredAt);
      const periodEnd = new Date(triggeredAt);
      let periodStart = new Date(triggeredAt);

      if (job.data.range === 'hourly') {
        periodStart.setHours(periodStart.getHours() - 1);
      } else if (job.data.range === 'daily') {
        periodStart.setDate(periodStart.getDate() - 1);
      } else {
        periodStart.setDate(periodStart.getDate() - 7);
      }

      await this.timeseriesService.saveTimeseriesSnapshot({
        deviceId: job.data.deviceId,
        periodType: job.data.range.toUpperCase() as any,
        periodStart,
        periodEnd,
      });
    } catch (error) {
      this.logger.error(`시계열 집계 실패: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }
}

