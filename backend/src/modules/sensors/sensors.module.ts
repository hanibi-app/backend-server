import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { ProcessingSession } from '../processing/entities/processing-session.entity';
import { RealtimeModule } from '../../realtime/realtime.module';
import { QueueNames } from '../../queues/queue.constants';
import { CharacterQueueProducer } from '../../queues/producers/character-queue.producer';
import { ReportQueueProducer } from '../../queues/producers/report-queue.producer';
import { SensorQueueProducer } from '../../queues/producers/sensor-queue.producer';
import { RequestLoggingInterceptor } from '../../common/interceptors/request-logging.interceptor';
import { SensorData } from './entities/sensor-data.entity';
import { SensorRequestLog } from './entities/sensor-request-log.entity';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
  imports: [
    DevicesModule,
    RealtimeModule,
    TypeOrmModule.forFeature([SensorData, ProcessingSession, SensorRequestLog]),
    BullModule.registerQueue(
      { name: QueueNames.SensorProcessing },
      { name: QueueNames.CharacterState },
      { name: QueueNames.ReportGeneration },
    ),
  ],
  controllers: [SensorsController],
  providers: [
    SensorsService,
    SensorQueueProducer,
    CharacterQueueProducer,
    ReportQueueProducer,
    RequestLoggingInterceptor,
  ],
  exports: [SensorsService],
})
export class SensorsModule {}

