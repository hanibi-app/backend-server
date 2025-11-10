import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from '../modules/chat/chat.module';
import { ChatMessage } from '../modules/chat/entities/chat-message.entity';
import { QuickCommand } from '../modules/chat/entities/quick-command.entity';
import { DevicesModule } from '../modules/devices/devices.module';
import { DeviceCommand } from '../modules/devices/entities/device-command.entity';
import { Device } from '../modules/devices/entities/device.entity';
import { ProcessingSession } from '../modules/processing/entities/processing-session.entity';
import { ReportsModule } from '../modules/reports/reports.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { DeviceControlProcessor } from './device-control.processor';
import { CharacterStateProcessor } from './character-state.processor';
import { NotificationProcessor } from './notification.processor';
import { ReportGenerationProcessor } from './report-generation.processor';
import { SensorProcessingProcessor } from './sensor-processing.processor';
import { TimeseriesAggregationProcessor } from './timeseries-aggregation.processor';
import { QueueNames } from '../queues/queue.constants';

@Module({
  imports: [
    ReportsModule,
    SettingsModule,
    DevicesModule,
    ChatModule,
    TypeOrmModule.forFeature([ProcessingSession, DeviceCommand, Device, ChatMessage, QuickCommand]),
    BullModule.registerQueue(
      { name: QueueNames.SensorProcessing },
      { name: QueueNames.ReportGeneration },
      { name: QueueNames.CharacterState },
      { name: QueueNames.TimeseriesAggregation },
      { name: QueueNames.Notification },
      { name: QueueNames.DeviceControl },
    ),
  ],
  providers: [
    SensorProcessingProcessor,
    ReportGenerationProcessor,
    CharacterStateProcessor,
    TimeseriesAggregationProcessor,
    NotificationProcessor,
    DeviceControlProcessor,
  ],
})
export class WorkersModule {}

