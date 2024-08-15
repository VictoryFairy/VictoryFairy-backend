import { Inject } from '@nestjs/common';

export const InjectRedisClient = () => Inject('REDIS_CLIENT');
