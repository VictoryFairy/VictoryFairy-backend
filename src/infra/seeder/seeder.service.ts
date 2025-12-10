import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { RedisConnectionService } from '../redis/redis-connection.service';
import { GameCronScheduler } from 'src/modules/game/application/game-cron.scheduler';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly gameCronScheduler: GameCronScheduler,
    private readonly customRedisService: RedisConnectionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onApplicationBootstrap() {
    await this.gameCronScheduler.setupThisAndNextMonthGameDataAndTodayGameTrigger();
    await this.customRedisService.initializeCacheOnRedisReady();
  }
}
