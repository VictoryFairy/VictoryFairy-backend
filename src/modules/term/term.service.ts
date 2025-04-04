import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserTerm } from 'src/modules/term/entities/user-term.entity';
import { Repository } from 'typeorm';
import { CachedTermList } from 'src/modules/term/types/term.type';
import { Term } from './entities/term.entity';
import { TermRedisService } from 'src/core/redis/term-redis.service';

@Injectable()
export class TermService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(UserTerm)
    private readonly userTermRepository: Repository<UserTerm>,
    private readonly termRedisService: TermRedisService,
  ) {}

  async getTermList(): Promise<CachedTermList> {
    const cachedTermList: CachedTermList =
      await this.termRedisService.getTermList();

    // 캐싱 데이터 있으면 캐싱 데이터 반환
    if (
      cachedTermList.required.length > 0 ||
      cachedTermList.optional.length > 0
    ) {
      return cachedTermList;
    }

    // 없으면 디비에서 조회
    const terms = await this.termRepository.find({});

    const termList: CachedTermList = { required: [], optional: [] };

    terms.forEach((term) => {
      const { id, is_required } = term;
      is_required
        ? termList.required.push({ id })
        : termList.optional.push({ id });
    });

    // Redis에 저장
    await this.termRedisService.saveTermList(terms);

    return termList;
  }

  async saveUserAgreedTerm(userId: number, termId: string | string[]) {
    const termIds = Array.isArray(termId) ? termId : [termId];
    try {
      for (const id of termIds) {
        await this.userTermRepository.insert({
          user_id: userId,
          term_id: id,
        });
      }
      /** 유저 약관 동의 여부 레디스 캐싱 */
      await this.termRedisService.updateUserTermInfo(userId, termId);
    } catch (error) {
      throw new InternalServerErrorException('유저 약관 저장 실패');
    }
  }

  async getUserAgreedTerms(userId: number): Promise<string[]> {
    /** 레디스 캐싱 조회 */
    const cachedUserTerm = await this.termRedisService.getUserTermInfo(userId);
    if (cachedUserTerm.length > 0) {
      return cachedUserTerm;
    }
    try {
      const terms = await this.userTermRepository.find({
        where: { user_id: userId },
        select: { term_id: true },
      });
      /** 약관 정보 디비에서 확인후 레디스 캐싱 */
      await this.termRedisService.saveUserTermInfo(userId, terms);
      return terms.map((term) => term.term_id);
    } catch (error) {
      throw new InternalServerErrorException('유저 약관 조회 실패');
    }
  }

  async deleteUserAgreedTerm(userId: number, termId: string) {
    try {
      await this.userTermRepository.delete({
        user_id: userId,
        term_id: termId,
      });
      await this.termRedisService.deleteUserTermInfo(userId);
    } catch (error) {
      throw new InternalServerErrorException('유저 약관 삭제 실패');
    }
  }
}
