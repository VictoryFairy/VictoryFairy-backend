import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from 'src/infra/redis/const/redis.const';
import { InjectRedisClient } from 'src/common/decorators/redis-inject.decorator';
import { UserTerm } from 'src/modules/account/core/domain/user-term.entity';
import { CachedTermList } from 'src/modules/term/core/types/term.interface';
import { Term } from 'src/modules/term/core/domain/term.entity';

@Injectable()
export class TermRedisService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

  // 약관 목록 저장
  async saveTermList(terms: Pick<Term, 'id' | 'is_required'>[]) {
    const data: CachedTermList = { required: [], optional: [] };

    terms.forEach((term) => {
      const { id, is_required } = term;
      is_required ? data.required.push({ id }) : data.optional.push({ id });
    });
    return await this.redisClient.set(RedisKeys.Term, JSON.stringify(data));
  }

  async getTermList(): Promise<CachedTermList> {
    const data = await this.redisClient.get(RedisKeys.Term);
    return data ? JSON.parse(data) : { required: [], optional: [] };
  }

  // 유저 약관 저장
  async saveUserTermInfo(
    userId: number,
    userTerms: Pick<UserTerm, 'term_id'>[],
  ) {
    const userTermIds = userTerms.map((term) => term.term_id);
    return await this.redisClient.hset(
      `${RedisKeys.UserTerm}`,
      `${userId}`,
      JSON.stringify(userTermIds),
    );
  }

  async updateUserTermInfo(userId: number, termId: string | string[]) {
    const termIds = Array.isArray(termId) ? termId : [termId];
    const prevRaw = await this.redisClient.hget(
      `${RedisKeys.UserTerm}`,
      `${userId}`,
    );
    const prevTermIds: string[] = prevRaw ? JSON.parse(prevRaw) : [];
    const updateData = Array.from(new Set([...prevTermIds, ...termIds]));
    const result = await this.redisClient.hset(
      `${RedisKeys.UserTerm}`,
      `${userId}`,
      JSON.stringify(updateData),
    );
    return result;
  }

  async deleteUserTermInfo(userId: number) {
    await this.redisClient.hdel(`${RedisKeys.UserTerm}`, `${userId}`);
  }

  async getUserTermInfo(userId: number): Promise<string[]> {
    const data = await this.redisClient.hget(
      `${RedisKeys.UserTerm}`,
      `${userId}`,
    );

    return data ? JSON.parse(data) : [];
  }
}

