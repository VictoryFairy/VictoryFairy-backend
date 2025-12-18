import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Redis } from 'ioredis';
import { EventName } from 'src/shared/const/event.const';
import { InjectRedisClient } from 'src/common/decorators/redis-inject.decorator';

@Injectable()
export class RedisConnectionService implements OnModuleInit {
  private readonly logger = new Logger(RedisConnectionService.name);
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.redisClient.on('ready', async () => {
      await this.initializeCacheOnRedisReady();
    });

    this.redisClient.on('end', () => {
      this.logger.error('Redis 연결이 끊어짐');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis 오류:', error);
    });
  }

  async initializeCacheOnRedisReady() {
    try {
      const test = await this.redisClient.ping();
      if (test === 'PONG') {
        this.logger.log('Redis 연결 확인');
        this.eventEmitter.emit(EventName.REDIS_CONNECT);
      }
    } catch (error) {
      this.logger.error('Redis 연결 실패:', error);
    }
  }
}
