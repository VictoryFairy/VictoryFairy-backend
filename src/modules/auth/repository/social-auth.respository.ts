import { SocialAuth } from '../entities/social-auth.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { CreateSocialAuthDto } from '../dto/internal/social-auth/create-social-auth.dto';
import { DeleteSocialAuthDto } from '../dto/internal/social-auth/delete-social-auth.dto';
import { FindOneResultSocialAuthDto } from '../dto/internal/social-auth/findone-social-auth.dto';
import { ISocialAuthRepository } from './social-auth.repository.interface';

export class SocialAuthRepository implements ISocialAuthRepository {
  constructor(
    @InjectRepository(SocialAuth)
    private readonly socialAuthRepo: Repository<SocialAuth>,
  ) {}

  async find(
    where: FindOptionsWhere<SocialAuth>,
  ): Promise<SocialAuth[] | null> {
    try {
      const result = await this.socialAuthRepo.find({ where });
      return result;
    } catch (error) {
      throw new InternalServerErrorException('social auth find error');
    }
  }

  async findOne(
    where: FindOptionsWhere<SocialAuth>,
  ): Promise<FindOneResultSocialAuthDto | null> {
    let result: SocialAuth | null = null;
    try {
      result = await this.socialAuthRepo.findOne({ where });
    } catch (error) {
      throw new InternalServerErrorException('social auth findOne error');
    }
    return result
      ? await FindOneResultSocialAuthDto.createAndValidate(result)
      : null;
  }

  async insertOne(data: CreateSocialAuthDto): Promise<boolean> {
    try {
      const { sub, provider, userId, providerEmail, isPrimary } = data;
      const result = await this.socialAuthRepo.insert({
        sub,
        provider,
        user_id: userId,
        provider_email: providerEmail,
        is_primary: isPrimary,
      });
      return result.raw.affectedRows > 0;
    } catch (error) {
      throw new InternalServerErrorException('social auth insertOne error');
    }
  }

  async deleteOne(data: DeleteSocialAuthDto): Promise<boolean> {
    try {
      const { userId, provider } = data;
      const result = await this.socialAuthRepo.delete({
        user_id: userId,
        provider,
      });
      return result.raw.affectedRows > 0;
    } catch (error) {
      throw new InternalServerErrorException('social auth deleteOne error');
    }
  }
}
