import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from 'src/modules/team/team.controller';
import { Team } from 'src/modules/team/entities/team.entity';
import { TeamService } from 'src/modules/team/team.service';
import { TEAM_REPOSITORY } from './repository/team.repository.interface';
import { TeamRepository } from './repository/team.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Team])],
  controllers: [TeamController],
  providers: [
    TeamService,
    { provide: TEAM_REPOSITORY, useClass: TeamRepository },
  ],
  exports: [TeamService],
})
export class TeamModule {}
