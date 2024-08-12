import { Module } from '@nestjs/common';
import { SchedulingService } from 'src/services/scheduling.service';
import { ScheduleModule } from '@nestjs/schedule';
import { GameModule } from './game.module';
import { AuthModule } from 'src/auth/auth.module';
import { RegisteredGameModule } from './registered-game.module';

@Module({
  imports: [ScheduleModule.forRoot(), GameModule, AuthModule, RegisteredGameModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
