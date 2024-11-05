import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from 'src/config/redis.config';
import { RedisConnectionService } from 'src/services/redis-connection.service';
import { RedisCachingService } from 'src/services/redis-caching.service';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: redisConfig,
      inject: [ConfigService],
    },
    RedisConnectionService,
    RedisCachingService,
  ],
  exports: [RedisConnectionService, RedisCachingService],
})
export class RedisModule {}
