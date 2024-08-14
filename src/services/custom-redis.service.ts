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
    await this.handleReady();

    this.redisClient.on('ready', async () => {
      await this.handleReady();
    });

    this.redisClient.on('end', () => {
      this.logger.error('Redis 연결이 끊어졌습니다.');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis 오류:', error);
    });
  }

  private async handleReady() {
    try {
      const test = await this.redisClient.ping();
      if (test === 'PONG') {
        this.logger.log('Redis 연결 확인 완료');
        setTimeout(() => {
          this.eventEmitter.emit('redis-connected');
        }, 2000);
      }
    } catch (error) {
      this.logger.error('Ping 테스트 실패:', error);
    }
  }
}
