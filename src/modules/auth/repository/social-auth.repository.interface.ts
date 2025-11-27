import { SocialAuth } from '../../account/core/domain/social-auth.entity';
import { FindOptionsWhere } from 'typeorm';
import { FindOneResultSocialAuthDto } from '../dto/internal/social-auth/findone-social-auth.dto';
import { DeleteSocialAuthDto } from '../dto/internal/social-auth/delete-social-auth.dto';
import { CreateSocialAuthDto } from '../dto/internal/social-auth/create-social-auth.dto';

export const SOCIAL_AUTH_REPOSITORY = Symbol('SOCIAL_AUTH_REPOSITORY');

export interface ISocialAuthRepository {
  find(where: FindOptionsWhere<SocialAuth>): Promise<SocialAuth[] | null>;
  findOne(
    where: FindOptionsWhere<SocialAuth>,
  ): Promise<FindOneResultSocialAuthDto | null>;
  insertOne(data: CreateSocialAuthDto): Promise<boolean>;
  deleteOne(data: DeleteSocialAuthDto): Promise<boolean>;
}
