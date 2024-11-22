import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { RedisConnectionService } from './redis-connection.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly customRedisService: RedisConnectionService,
  ) {}

  async onApplicationBootstrap() {
    await this.schedulingService.batchUpdateGames();
    await this.customRedisService.initializeCacheOnRedisReady();
  }
}
