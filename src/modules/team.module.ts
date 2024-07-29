import { Module } from '@nestjs/common';
import { TeamController } from 'src/controllers/team.controller';
import { TeamService } from 'src/services/team.service';

@Module({
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
