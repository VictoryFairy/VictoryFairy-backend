import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { TeamService } from './team.service';
import { StadiumService } from './stadium.service';
import { SchedulingService } from './scheduling.service';
import { UserService } from './user.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
    private readonly schedulingService: SchedulingService,
    private readonly userService: UserService,
  ) {}

  async onApplicationBootstrap() {
    await this.teamService.seed();
    await this.stadiumService.seed();
    await this.userService.seed();

    await this.schedulingService.batchUpdateGames();
  }
}
