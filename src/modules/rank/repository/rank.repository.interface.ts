import { FindOneOptions, FindOptionsWhere } from 'typeorm';
import { Rank } from '../entities/rank.entity';
import { GameResultColumnMap } from '../types/game-result-column-map.type';
import { InsertRankDto } from '../dto/internal/insert-rank.dto';

export const RANK_REPOSITORY = Symbol('RANK_REPOSITORY');

export interface IRankRepository {
  find(where: FindOptionsWhere<Rank>): Promise<Rank[]>;
  findOne(where: FindOneOptions<Rank>): Promise<Rank | null>;
  aggregateRecord(
    userId: number,
    withUserProfile: boolean,
  ): Promise<AggregatedRecordRaw>;
  isExist(where: FindOptionsWhere<Rank>): Promise<boolean>;
  insert(dto: InsertRankDto): Promise<{ insertedId: number }>;
  adjustRecord(
    where: FindOptionsWhere<Rank>,
    column: GameResultColumnMap,
    isRegister: boolean,
  ): Promise<boolean>;
}

export interface AggregatedRecordRaw {
  win: string;
  lose: string;
  tie: string;
  cancel: string;
  total: string;
  user_id: number;
  id?: number;
  nickname?: string;
  profile_image?: string;
  email?: string;
}
