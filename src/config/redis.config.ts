import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';
import { IDotenv } from './dotenv.interface';

export const redisConfig = (configService: ConfigService<IDotenv>) => {
  const options: RedisOptions = {
    host: configService.get('REDIS_CONTAINER', { infer: true }) || 'localhost',
    port: configService.get('REDIS_TCP_PORT', { infer: true }),
    password: configService.get('REDIS_PASSWORD', { infer: true }),
    retryStrategy: (times) => times * 1000,
  };

  return new Redis(options);
};
