import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { TeamService } from "./services/team.service";
import { StadiumService } from "./services/stadium.service";
import { BatchService } from "./services/batch.service";

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