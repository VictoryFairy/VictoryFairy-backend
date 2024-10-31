import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import { Term } from 'src/entities/term.entity';
import { RedisKeys } from 'src/enum/redis.enum';
import { In, Repository } from 'typeorm';

@Injectable()
export class TermService {
  private readonly logger = new Logger(TermService.name);
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

  async getActiveTerm() {
    const termList = await this.termRepository.find({
      where: { is_active: true },
    });
    if (termList.length === 0) {
      throw new NotFoundException('약관 리스트가 존재하지 않습니다.');
    }
    return termList;
  }

  async getTermsById(id: number | number[]): Promise<Term[]> {
    const idArr = Array.isArray(id) ? id : [id];
    const foundTerms = await this.termRepository.find({
      where: { id: In(idArr) },
    });
    return foundTerms;
  }

  async getRequiredTermId(): Promise<number[]> {
    const requiredTermId = await this.redisClient.get(
      `${RedisKeys.TERM}:required`,
    );

    if (!requiredTermId) {
      const termIdArr = await this.cachingRequiredTermId();
      return termIdArr;
    }
    return JSON.parse(requiredTermId);
  }

  private async cachingRequiredTermId() {
    const requiredTermList = await this.termRepository.find({
      where: { is_active: true, is_required: true },
      select: { id: true },
    });

    const termIdArr = requiredTermList.map((term) => term.id);
    await this.redisClient.set(
      `${RedisKeys.TERM}:required`,
      JSON.stringify(termIdArr),
    );
    this.logger.log('필수 약관 아이디 리스트 캐싱 완료');
    return termIdArr;
  }
}
