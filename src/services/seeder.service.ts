import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { TeamService } from './team.service';
import { StadiumService } from './stadium.service';
import { SchedulingService } from './scheduling.service';
import { UserService } from './user.service';
import { ParkingInfoService } from './parking-info.service';
import { CheeringSongService } from './cheering-song.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
    private readonly schedulingService: SchedulingService,
    private readonly userService: UserService,
    private readonly parkingInfoService: ParkingInfoService,
    private readonly cheeringSongService: CheeringSongService,
  ) {}

  async onApplicationBootstrap() {
    await this.teamService.seed();
    await this.stadiumService.seed();
    await this.userService.seed();
    // await this.parkingInfoService.seed();
    // await this.cheeringSongService.seed();

    await this.schedulingService.batchUpdateGames();
  }
}
