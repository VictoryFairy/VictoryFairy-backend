import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GameModule } from 'src/modules/game/game.module';
import { SchedulingService } from './scheduling.service';
import { RegisteredGameModule } from '../registered-game/registered-game.module';
import { ReportScheduleService } from './report.schedule.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GameModule,
    RegisteredGameModule,
    UserModule,
  ],
  providers: [SchedulingService, ReportScheduleService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
