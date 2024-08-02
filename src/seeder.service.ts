import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { TeamService } from "./services/team.service";
import { StadiumService } from "./services/stadium.service";
import { BatchService } from "./services/batch.service";
import { UserService } from "./services/user.service";

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
    private readonly batchService: BatchService,
    private readonly userService: UserService,
  ) {}
  
  onApplicationBootstrap() {
    // find or create 때문에 팀이랑 구장 seed는 필요 없을지도?
    // this.teamService.seed();
    // this.stadiumService.seed();
    this.userService.seed();

    this.batchService.batchUpdateGames();
  }
}