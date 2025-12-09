import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyReportScheduler } from './daily-report.scheduler';
import { ExternalChannelModule } from 'src/infra/external-channel/external-channel.module';

@Module({
  imports: [ScheduleModule.forRoot(), ExternalChannelModule],
  providers: [DailyReportScheduler],
})
export class WorkerModule {}

