import { Injectable } from '@nestjs/common';
import { Term } from '../entities/term.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CachedTermList } from '../types/term.type';
import { TermRedisService } from 'src/core/redis/term-redis.service';

@Injectable()
export class TermCoreService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepo: Repository<Term>,
    private readonly termRedisService: TermRedisService,
  ) {}

  async getRequiredTermIds(): Promise<{ requiredTermIds: string[] }> {
    const terms = await this.termRepo.find({
      where: { is_required: true },
      select: { id: true },
    });
    return { requiredTermIds: terms.map((term) => term.id) };
  }

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
    const terms = await this.termRepo.find({});

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
}
