import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GameModule } from 'src/modules/game/game.module';
import { SchedulingService } from './scheduling.service';
import { RegisteredGameModule } from '../registered-game/registered-game.module';

@Module({
  imports: [ScheduleModule.forRoot(), GameModule, RegisteredGameModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
