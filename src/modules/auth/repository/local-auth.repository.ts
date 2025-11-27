import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LocalAuth } from '../../account/core/domain/local-auth.entity';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CreateLocalAuthDto } from '../dto/internal/local-auth/create-local-auth.dto';
import { ILocalAuthRepository } from './local-auth.repository.interface';
import { UpdateLocalAuthDto } from '../dto/internal/local-auth/update-local-auth.dto';

@Injectable()
export class LocalAuthRepository implements ILocalAuthRepository {
  constructor(
    @InjectRepository(LocalAuth)
    private readonly localAuthRepo: Repository<LocalAuth>,
  ) {}

  async isExist(userId: number): Promise<boolean> {
    try {
      const isExist = await this.localAuthRepo.exists({
        where: { user_id: userId },
      });
      return isExist;
    } catch (error) {
      throw new InternalServerErrorException('로컬 계정 존재 여부 확인 실패');
    }
  }

  async updateOne(data: UpdateLocalAuthDto): Promise<boolean> {
    try {
      const result = await this.localAuthRepo.update(
        { user_id: data.userId },
        { password: data.password },
      );
      return result.affected > 0;
    } catch (error) {
      throw new InternalServerErrorException('비밀번호 업데이트 실패');
    }
  }

  async findOne(where: FindOptionsWhere<LocalAuth>): Promise<LocalAuth | null> {
    try {
      const result = await this.localAuthRepo.findOne({ where });
      return result;
    } catch (error) {
      throw new InternalServerErrorException('로컬 계정 조회 실패');
    }
  }
  async insertOne(data: CreateLocalAuthDto): Promise<boolean> {
    try {
      const { userId: user_id, password } = data;
      const result = await this.localAuthRepo.insert({ user_id, password });
      return result.raw.affectedRows > 0;
    } catch (error) {
      throw new InternalServerErrorException('로컬 계정 생성 실패');
    }
  }
}
