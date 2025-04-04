import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { CODE_LIMIT_TIME } from 'src/modules/auth/const/auth.const';
import { RedisKeys } from 'src/core/redis/const/redis.const';
import { InjectRedisClient } from 'src/common/decorators/redis-inject.decorator';
import { IOAuthStateCachingData } from 'src/modules/auth/types/auth.type';

export class AuthRedisService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

  async cachingVerificationCode(email: string, code: string) {
    try {
      await this.redisClient.set(
        `${RedisKeys.EMAIL_CODE}:${email}`,
        code,
        'EX',
        CODE_LIMIT_TIME,
      );
    } catch (error) {
      throw new InternalServerErrorException('레디스 저장 실패');
    }
  }

  async getCachedVerificationCode(email: string) {
    const getCachedCode = await this.redisClient.get(
      `${RedisKeys.EMAIL_CODE}:${email}`,
    );
    return getCachedCode;
  }

  async deleteVerificationCode(email: string) {
    try {
      await this.redisClient.del(`${RedisKeys.EMAIL_CODE}:${email}`);
    } catch (error) {
      throw new InternalServerErrorException('레디스 삭제 실패');
    }
  }

  async saveOAuthState(data: IOAuthStateCachingData) {
    const stringifiedData = JSON.stringify(data);
    const result = await this.redisClient.set(
      `${RedisKeys.OAUTH_STATE}:${data.state}`,
      stringifiedData,
      'EX',
      60, // 60초만 캐싱
    );
    return result;
  }

  async getOAuthState(state: string) {
    const rawData = await this.redisClient.get(
      `${RedisKeys.OAUTH_STATE}:${state}`,
    );
    if (!rawData) throw new UnauthorizedException('state 만료되었거나 없음');
    const data: IOAuthStateCachingData = await JSON.parse(rawData);
    return data;
  }

  async deleteOAuthState(state: string) {
    await this.redisClient.del(`${RedisKeys.OAUTH_STATE}:${state}`);
  }

  async saveOAuthCode(
    code: string,
    uuid: string,
    ip: string,
  ): Promise<string | null> {
    const data = { code, ip };
    const stringifiedCode = JSON.stringify(data);
    const result = await this.redisClient.set(
      `${RedisKeys.OAUTH_CODE}:${uuid}`,
      stringifiedCode,
      'EX',
      30,
    );
    return result === 'OK' ? uuid : null;
  }

  async getOAuthCode(uuid: string): Promise<{ code: string; ip: string }> {
    const rawCodeWithIp = await this.redisClient.get(
      `${RedisKeys.OAUTH_CODE}:${uuid}`,
    );
    if (!rawCodeWithIp) throw new UnauthorizedException('코드 만료 또는 없음');
    const data = JSON.parse(rawCodeWithIp);
    return data;
  }

  async deleteOAuthCode(uuid: string): Promise<void> {
    await this.redisClient.del(`${RedisKeys.OAUTH_CODE}:${uuid}`);
  }
}
