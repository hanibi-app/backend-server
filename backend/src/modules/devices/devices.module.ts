import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueNames } from '../../queues/queue.constants';
import { DeviceCommandQueueProducer } from '../../queues/producers/device-command-queue.producer';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceCommand } from './entities/device-command.entity';
import { Device } from './entities/device.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceCommand]),
    BullModule.registerQueue({ name: QueueNames.DeviceControl }),
  ],
  controllers: [DevicesController],
  providers: [DevicesService, DeviceCommandQueueProducer],
  exports: [DevicesService, TypeOrmModule, DeviceCommandQueueProducer],
})
export class DevicesModule {}

