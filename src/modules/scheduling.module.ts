import { Module } from '@nestjs/common';
import { SchedulingService } from 'src/services/scheduling.service';
import { ScheduleModule } from '@nestjs/schedule';
import { GameModule } from './game.module';

@Module({
  imports: [ScheduleModule.forRoot(), GameModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
