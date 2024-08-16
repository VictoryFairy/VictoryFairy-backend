import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from 'src/config/redis.config';
import { CustomRedisService } from 'src/services/custom-redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: redisConfig,
      inject: [ConfigService],
    },
    CustomRedisService,
  ],
  exports: ['REDIS_CLIENT', CustomRedisService],
})
export class RedisModule {}
