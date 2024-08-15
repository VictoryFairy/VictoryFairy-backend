import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Redis } from 'ioredis';

@Injectable()
export class CustomRedisService implements OnModuleInit {
  private readonly logger = new Logger(CustomRedisService.name);
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.redisClient.on('ready', async () => {
      await this.initializeCacheOnRedisReady();
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
        this.eventEmitter.emit('redis-connected');
      }
    } catch (error) {
      this.logger.error('Redis 연결 실패:', error);
    }
  }
}
