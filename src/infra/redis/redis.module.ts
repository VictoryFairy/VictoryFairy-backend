import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from 'src/config/redis.config';
import { RedisConnectionService } from 'src/infra/redis/redis-connection.service';
import { RedisThrottlerStorageService } from 'src/infra/redis/redis-throttler-storage.service';

/**
 * @description Redis 인프라 모듈
 * Redis Client Provider와 공통 Redis 서비스를 제공합니다.
 * 도메인 특화 Redis 서비스는 각 도메인의 Core 모듈에서 구현합니다.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: redisConfig,
      inject: [ConfigService],
    },
    RedisConnectionService,
    RedisThrottlerStorageService,
  ],
  exports: ['REDIS_CLIENT', RedisConnectionService, RedisThrottlerStorageService],
})
export class RedisModule {}
