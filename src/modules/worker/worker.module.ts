import { Module } from '@nestjs/common';
import { DailyReportScheduler } from './daily-report.scheduler';
import { ExternalChannelModule } from 'src/infra/external-channel/external-channel.module';

@Module({
  imports: [ExternalChannelModule],
  providers: [DailyReportScheduler],
})
export class WorkerModule {}
