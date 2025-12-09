import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { RedisConnectionService } from '../redis/redis-connection.service';
import { GameCronScheduler } from 'src/modules/game/application/game-cron.scheduler';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly gameCronScheduler: GameCronScheduler,
    private readonly customRedisService: RedisConnectionService,
  ) {}

  async onApplicationBootstrap() {
    await this.gameCronScheduler.setupThisAndNextMonthGameDataAndTodayGameTrigger();
    await this.customRedisService.initializeCacheOnRedisReady();
  }
}
