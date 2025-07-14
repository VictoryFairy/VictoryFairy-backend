import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rank } from '../entities/rank.entity';
import {
  FindOneOptions,
  FindOptionsWhere,
  Repository,
  UpdateResult,
} from 'typeorm';
import { InsertRankDto } from '../dto/internal/insert-rank.dto';
import { GameResultColumnMap } from '../types/game-result-column-map.type';
import {
  AggregatedRecordRaw,
  IRankRepository,
} from './rank.repository.interface';

@Injectable()
export class RankRepository implements IRankRepository {
  constructor(
    @InjectRepository(Rank)
    private readonly rankRepository: Repository<Rank>,
  ) {}

  async find(where: FindOptionsWhere<Rank>): Promise<Rank[]> {
    try {
      const foundRankData = await this.rankRepository.find({ where });
      return foundRankData;
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 조회 실패');
    }
  }

  async findOne(where: FindOneOptions<Rank>): Promise<Rank | null> {
    try {
      const foundRankData = await this.rankRepository.findOne(where);
      return foundRankData;
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 조회 실패');
    }
  }

  async isExist(where: FindOptionsWhere<Rank>): Promise<boolean> {
    try {
      const foundRankData = await this.rankRepository.exists({ where });
      return foundRankData;
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 존재 여부 확인 실패');
    }
  }

  async insert(dto: InsertRankDto): Promise<{ insertedId: number }> {
    try {
      const { team_id, user_id, active_year } = dto;
      const result = await this.rankRepository.insert({
        team_id,
        user: { id: user_id },
        active_year,
      });
      return { insertedId: result.identifiers[0].id };
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 인서트 실패');
    }
  }

  async aggregateRecord(
    userId: number,
    withUserProfile: boolean,
  ): Promise<AggregatedRecordRaw> {
    try {
      const queryBuilder = this.rankRepository
        .createQueryBuilder()
        .from(
          (qb) =>
            qb
              .select([
                'SUM(r.win) as win',
                'SUM(r.lose) as lose',
                'SUM(r.tie) as tie',
                'SUM(r.cancel) as cancel',
                'SUM(r.win + r.lose + r.tie + r.cancel) as total',
                'r.user_id as user_id',
              ])
              .from('rank', 'r')
              .where('r.user_id = :userId', { userId })
              .groupBy('r.user_id'),
          'st',
        )
        .select(['st.win, st.lose, st.tie, st.cancel, st.total']);

      if (withUserProfile) {
        queryBuilder
          .leftJoin('user', 'u', 'u.id = st.user_id')
          .addSelect([
            'u.id as id',
            'u.nickname as nickname',
            'u.profile_image as profile_image',
            'u.email as email',
          ]);
      }

      const result = await queryBuilder.getRawOne<AggregatedRecordRaw>();
      return result;
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 기록 집계 실패');
    }
  }

  async adjustRecord(
    where: FindOptionsWhere<Rank>,
    column: GameResultColumnMap,
    isRegister: boolean, // 직관 경기 등록? 삭제?
  ): Promise<boolean> {
    try {
      let result: UpdateResult;
      if (isRegister) {
        result = await this.rankRepository.increment(where, column, 1);
      } else {
        result = await this.rankRepository.decrement(where, column, 1);
      }
      return result.raw.affectedRows > 0;
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 기록 조정 실패');
    }
  }
}
