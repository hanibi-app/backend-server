import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { Device } from '../devices/entities/device.entity';
import { ProcessingSession } from '../processing/entities/processing-session.entity';
import { LifeScoreFormula } from './entities/life-score-formula.entity';
import { TimeseriesStats } from './entities/timeseries-stats.entity';
import { ReportsController } from './reports.controller';
import { EcoScoreService } from './services/eco-score.service';
import { ReportsService } from './services/reports.service';
import { TimeseriesService } from './services/timeseries.service';

@Module({
  imports: [
    DevicesModule,
    TypeOrmModule.forFeature([ProcessingSession, Device, LifeScoreFormula, TimeseriesStats]),
  ],
  controllers: [ReportsController],
  providers: [EcoScoreService, ReportsService, TimeseriesService],
  exports: [EcoScoreService, ReportsService, TimeseriesService],
})
export class ReportsModule {}

