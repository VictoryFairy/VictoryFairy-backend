import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { CODE_LIMIT_TIME } from 'src/const/auth.const';
import { RedisKeys } from 'src/const/redis.const';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import { IOAuthStateCachingData } from 'src/types/auth.type';

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
      30, // 30초만 캐싱
    );
    return result;
  }

  async getOAuthState(state: string) {
    const rawData = await this.redisClient.get(
      `${RedisKeys.OAUTH_STATE}:${state}`,
    );
    const data: IOAuthStateCachingData = await JSON.parse(rawData);
    return data;
  }

  async deleteOAuthState(state: string) {
    await this.redisClient.del(`${RedisKeys.OAUTH_STATE}:${state}`);
  }

  async saveOAuthCode(code: string, uuid: string): Promise<string | null> {
    const stringifiedCode = JSON.stringify(code);
    const result = await this.redisClient.set(
      `${RedisKeys.OAUTH_CODE}:${uuid}`,
      stringifiedCode,
      'EX',
      15,
    );
    return result === 'OK' ? uuid : null;
  }

  async getOAuthCode(uuid: string): Promise<string> {
    const rawCode = await this.redisClient.get(
      `${RedisKeys.OAUTH_CODE}:${uuid}`,
    );
    if (!rawCode) throw new UnauthorizedException('코드 만료 또는 없음');
    const code = JSON.parse(rawCode);
    await this.deleteOAuthCode(uuid);
    return code;
  }

  async deleteOAuthCode(uuid: string): Promise<void> {
    await this.redisClient.del(`${RedisKeys.OAUTH_CODE}:${uuid}`);
  }
}
