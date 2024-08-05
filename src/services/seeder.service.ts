import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { TeamService } from './team.service';
import { StadiumService } from './stadium.service';
import { BatchService } from './batch.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
    private readonly batchService: BatchService,
  ) {}

  onApplicationBootstrap() {
    this.teamService.seed();
    this.stadiumService.seed();

    this.batchService.batchUpdateGames();
  }
}
