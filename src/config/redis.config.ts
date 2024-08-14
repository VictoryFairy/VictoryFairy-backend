import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';

export const redisConfig = (configService: ConfigService) => {
  const options: RedisOptions = {
    host: configService.get<string>('REDIS_CONTAINER') || 'localhost',
    port: parseInt(configService.get<string>('REDIS_TCP_PORT')),
    password: configService.get<string>('REDIS_PASSWORD'),
    retryStrategy: (times) => {
      // 첫 시도 1초 ... 마지막 시도 6초
      const delay = Math.min(times * 1000, 6000);
      return delay;
    },
  };

  return new Redis(options);
};
