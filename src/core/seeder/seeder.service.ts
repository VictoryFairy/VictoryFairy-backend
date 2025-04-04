import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { RedisConnectionService } from '../redis/redis-connection.service';
import { SchedulingService } from '../../modules/game/scheduling/scheduling.service';

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
