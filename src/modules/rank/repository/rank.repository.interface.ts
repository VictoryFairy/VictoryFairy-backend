import { FindOneOptions, FindOptionsWhere } from 'typeorm';
import { Rank } from '../entities/rank.entity';
import { GameResultColumnMap } from '../types/game-result-column-map.type';
import { InsertRankDto } from '../dto/internal/insert-rank.dto';

export const RANK_REPOSITORY = Symbol('RANK_REPOSITORY');

export interface IRankRepository {
  find(where: FindOptionsWhere<Rank>): Promise<Rank[]>;
  findOne(where: FindOneOptions<Rank>): Promise<Rank | null>;
  isExist(where: FindOptionsWhere<Rank>): Promise<boolean>;
  insert(dto: InsertRankDto): Promise<boolean>;
  adjustRecord(
    where: FindOptionsWhere<Rank>,
    column: GameResultColumnMap,
    isRegister: boolean,
  ): Promise<boolean>;
}
