import { Module } from '@nestjs/common';
import { TeamCoreModule } from '../core/team-core.module';
import { TeamController } from './controllers/team.controller';
import { TeamQueryService } from './team-query.service';
import { TeamCommandService } from './team-command.service';

@Module({
  imports: [TeamCoreModule],
  controllers: [TeamController],
  providers: [TeamQueryService, TeamCommandService],
  exports: [TeamCoreModule, TeamCommandService],
})
export class TeamApplicationModule {}
