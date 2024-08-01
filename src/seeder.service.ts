import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { TeamService } from "./services/team.service";
import { StadiumService } from "./services/stadium.service";

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
  ) {}
  
  onApplicationBootstrap() {
    this.teamService.seed();
    this.stadiumService.seed();
  }
}