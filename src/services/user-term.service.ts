import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserTerm } from 'src/entities/user-term.entity';
import { Repository } from 'typeorm';
import { TermService } from './term.service';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import Redis from 'ioredis';
import { RedisKeys } from 'src/enum/redis.enum';

@Injectable()
export class UserTermService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
    @InjectRepository(UserTerm)
    private readonly userTermRepository: Repository<UserTerm>,
    private readonly termService: TermService,
  ) {}

  /** 해당 유저가 아직 동의하지 않은 약관의 id 찾기 */
  async getUnacceptedTermAboutUser(userId: number): Promise<number[]> {
    const requiredTermId: number[] = await this.termService.getRequiredTermId();
    const userAgreedTermArray = await this.getAgreementTermIdsAboutUser(userId);

    if (userAgreedTermArray.length === 0) {
      return requiredTermId;
    }

    const userAgreedTermArrSet = new Set(userAgreedTermArray);

    const unacceptedTermId = requiredTermId.filter(
      (id) => !userAgreedTermArrSet.has(id),
    );

    // 필수 약관 동의 잘 되어 있으면 레디스에 캐싱하기
    if (unacceptedTermId.length === 0) {
      await this.redisClient.set(
        `${RedisKeys.TERM}:${userId.toString()}`,
        JSON.stringify(userAgreedTermArray),
        'EX',
        1296000, // ttl 15일로 설정, 단위 초
      );
    }

    return unacceptedTermId;
  }

  async getAgreementTermIdsAboutUser(userId: number): Promise<number[]> {
    //레디스에 캐싱되었는지 확인하고 가져오기
    const getCachingTermIds = await this.redisClient.get(
      `${RedisKeys.TERM}:${userId.toString()}`,
    );

    if (!getCachingTermIds) {
      const agreedTerms = await this.userTermRepository.find({
        where: { user_id: userId, term: { is_active: true } },
        relations: { term: true },
      });

      const userAgreeTermIdsArr = agreedTerms.map((term) => term.term_id);
      return userAgreeTermIdsArr;
    }
    return JSON.parse(getCachingTermIds);
  }

  /** 유저 약관 동의하기 */
  async createUserTerm(userId: number, termIds: number[]) {
    if (termIds.length === 0) {
      const idsArr = await this.termService.getRequiredTermId();
      termIds.push(...idsArr);
    }
    const userTermObj = termIds.map((termId) =>
      this.userTermRepository.create({
        user_id: userId,
        term_id: termId,
      }),
    );
    const result = await this.userTermRepository.insert(userTermObj);
    return result;
  }
}
