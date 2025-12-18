import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './domain/team.entity';
import { TeamCoreService } from './team-core.service';

@Module({
  imports: [TypeOrmModule.forFeature([Team])],
  providers: [TeamCoreService],
  exports: [TeamCoreService],
})
export class TeamCoreModule {}
