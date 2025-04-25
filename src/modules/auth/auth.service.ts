import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/core/mail/mail.service';
import { createRandomCode } from 'src/common/utils/random-code.util';
import { CODE_LENGTH, SocialProvider } from 'src/modules/auth/const/auth.const';
import { EmailWithCodeDto } from 'src/modules/user/dto/user.dto';
import { v7 as uuidv7 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from 'src/modules/user/const/user.const';
import { AuthRedisService } from 'src/core/redis/auth-redis.service';
import { IOAuthStateCachingData } from 'src/modules/auth/strategies/interface/oauth.interface';
import { LocalAuth } from './entities/local-auth.entity';
import { SocialAuth } from './entities/social-auth.entity';
import {
  ISocialAuthRepository,
  SOCIAL_AUTH_REPOSITORY,
} from './repository/social-auth.repository.interface';
import { DeleteSocialAuthDto } from './dto/internal/social-auth/delete-social-auth.dto';
import { CreateSocialAuthDto } from './dto/internal/social-auth/create-social-auth.dto';
import {
  ILocalAuthRepository,
  LOCAL_AUTH_REPOSITORY,
} from './repository/local-auth.repository.interface';
import { CreateLocalAuthDto } from './dto/internal/local-auth/create-local-auth.dto';
import { UpdateLocalAuthDto } from './dto/internal/local-auth/update-local-auth.dto';
import { FindOptionsWhere } from 'typeorm';
import { FindOneResultSocialAuthDto } from './dto/internal/social-auth/findone-social-auth.dto';
import { IJwtPayload } from './types/auth.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly authRedisService: AuthRedisService,
    @Inject(SOCIAL_AUTH_REPOSITORY)
    private readonly socialAuthRepo: ISocialAuthRepository,
    @Inject(LOCAL_AUTH_REPOSITORY)
    private readonly localAuthRepo: ILocalAuthRepository,
  ) {}

  async getSocialAuth(
    where: FindOptionsWhere<SocialAuth>,
  ): Promise<FindOneResultSocialAuthDto | null> {
    const socialAuth = await this.socialAuthRepo.findOne(where);
    return socialAuth;
  }

  async makeCodeAndSendMail(email: string) {
    const code = createRandomCode(CODE_LENGTH);
    const result = await this.mailService.sendAuthCodeMail(email, code);
    if (!result) {
      throw new InternalServerErrorException('이메일 전송 실패');
    }
    await this.authRedisService.cachingVerificationCode(email, code);
    return result;
  }

  async verifyEmailCode(dto: EmailWithCodeDto) {
    const { code, email } = dto;
    const getCachedCode =
      await this.authRedisService.getCachedVerificationCode(email);
    if (!getCachedCode || getCachedCode !== code) {
      throw new UnauthorizedException('인증 코드 틀림');
    }
    await this.authRedisService.deleteVerificationCode(email);

    return true;
  }

  issueToken(
    payload: Pick<IJwtPayload, 'id' | 'email'>,
    type: 'refresh' | 'access',
  ) {
    const secret =
      type === 'refresh'
        ? this.configService.get<string>('JWT_REFRESH_SECRET')
        : this.configService.get<string>('JWT_ACCESS_SECRET');
    const exTime =
      type === 'refresh'
        ? this.configService.get<string>('REFRESH_EXPIRE_TIME')
        : this.configService.get<string>('ACCESS_EXPIRE_TIME');
    return this.jwtService.sign(
      { ...payload, type: type === 'refresh' ? 'rf' : 'ac' },
      {
        secret,
        expiresIn: parseInt(exTime),
      },
    );
  }

  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashPw = await bcrypt.hash(newPassword, HASH_ROUND);
    const isLocalAuth = await this.localAuthRepo.isExist(userId);
    if (!isLocalAuth) {
      throw new ForbiddenException('로컬 계정이 아닙니다.');
    }

    const updateLocalAuthDto = await UpdateLocalAuthDto.createAndValidate({
      userId,
      password: hashPw,
    });
    await this.localAuthRepo.updateOne(updateLocalAuthDto);
    return true;
  }

  async verifyLocalAuth(userId: number, password: string): Promise<boolean> {
    const localAuth = await this.localAuthRepo.findOne({ user_id: userId });
    if (!localAuth?.password) return false;
    return bcrypt.compare(password, localAuth.password);
  }

  async createLocalAuth(userId: number, password: string) {
    const hashPw = await bcrypt.hash(password, HASH_ROUND);

    const createLocalAuthDto = await CreateLocalAuthDto.createAndValidate({
      userId,
      password: hashPw,
    });
    await this.localAuthRepo.insertOne(createLocalAuthDto);
    return true;
  }

  async getLocalAuth(userId: number): Promise<LocalAuth | null> {
    const localAuth = await this.localAuthRepo.findOne({ user_id: userId });
    return localAuth;
  }

  async getUserWithSocialAuthList(userId: number): Promise<SocialAuth[]> {
    const socialAuths = await this.socialAuthRepo.find({ user_id: userId });
    return socialAuths;
  }

  async deleteSocialAuth(data: DeleteSocialAuthDto): Promise<boolean> {
    return await this.socialAuthRepo.deleteOne(data);
  }

  async saveOAuthStateWithUser(data: {
    provider: SocialProvider;
    userId?: number;
  }): Promise<{ state: string }> {
    const state = uuidv7();
    await this.authRedisService.saveOAuthState({ ...data, state });
    return { state };
  }

  /** @returns 정상가입 - true | 소셜로그인 없으나 기존 이메일 있는 경우 - false | 그 외 DB저장 실패 - Throw Error */
  async createSocialAuth(
    socialAuthData: CreateSocialAuthDto,
  ): Promise<boolean> {
    return await this.socialAuthRepo.insertOne(socialAuthData);
  }

  async getOAuthStateData(state: string): Promise<IOAuthStateCachingData> {
    const data = await this.authRedisService.getOAuthState(state);
    // 캐싱 삭제
    await this.authRedisService.deleteOAuthState(state);
    return data;
  }

  async createUuidAndCachingCode(
    code: string,
    ip: string,
  ): Promise<string | null> {
    const uuid = uuidv7();
    const result = await this.authRedisService.saveOAuthCode(code, uuid, ip);
    return result;
  }

  async getCodeByPid(uuid: string): Promise<{ code: string; ip: string }> {
    const codeWithIp = await this.authRedisService.getOAuthCode(uuid);
    //캐싱 삭제
    await this.authRedisService.deleteOAuthCode(uuid);
    return codeWithIp;
  }
}
