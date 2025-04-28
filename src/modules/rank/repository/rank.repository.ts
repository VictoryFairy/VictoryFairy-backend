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
import { IRankRepository } from './rank.repository.interface';

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

  async insert(dto: InsertRankDto): Promise<boolean> {
    try {
      const result = await this.rankRepository.insert(dto);
      return result.raw.affectedRows > 0;
    } catch (error) {
      throw new InternalServerErrorException('DB Rank 인서트 실패');
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
