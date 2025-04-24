import { FindOptionsWhere } from 'typeorm';
import { LocalAuth } from '../entities/local-auth.entity';
import { CreateLocalAuthDto } from '../dto/local-auth/create-local-auth.dto';
import { UpdateLocalAuthDto } from '../dto/local-auth/update-local-auth.dto';

export const LOCAL_AUTH_REPOSITORY = Symbol('LOCAL_AUTH_REPOSITORY');

export interface ILocalAuthRepository {
  isExist(userId: number): Promise<boolean>;
  updateOne(data: UpdateLocalAuthDto): Promise<boolean>;
  findOne(where: FindOptionsWhere<LocalAuth>): Promise<LocalAuth | null>;
  insertOne(data: CreateLocalAuthDto): Promise<boolean>;
}
