import { Module } from '@nestjs/common';
import { BatchService } from 'src/services/batch.service';
import { ScheduleModule } from '@nestjs/schedule'
import { GameModule } from './game.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GameModule,
  ],
  providers: [BatchService],
})
export class BatchModule {}
