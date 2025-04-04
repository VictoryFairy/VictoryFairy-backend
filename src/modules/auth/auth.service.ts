import {
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
import { CreateSocialAuthDto } from 'src/modules/account/account.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { HASH_ROUND } from 'src/modules/user/const/user.const';
import { AuthRedisService } from 'src/core/redis/auth-redis.service';
import { User } from '../user/entities/user.entity';
import {
  IJwtPayload,
  IOAuthStateCachingData,
} from 'src/modules/auth/types/auth.type';
import { LocalAuth } from './entities/local-auth.entity';
import { SocialAuth } from './entities/social-auth.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly authRedisService: AuthRedisService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LocalAuth)
    private readonly localAuthRepository: Repository<LocalAuth>,
    @InjectRepository(SocialAuth)
    private readonly socialAuthRepository: Repository<SocialAuth>,
  ) {}

  async getUserForAuth(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { support_team: true },
      select: {
        id: true,
        email: true,
        nickname: true,
        support_team: { id: true, name: true },
      },
    });
    if (!user) {
      return null;
    }
    return user;
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
    try {
      const hashPw = await bcrypt.hash(newPassword, HASH_ROUND);
      await this.localAuthRepository.update(
        { user_id: userId },
        { password: hashPw },
      );
      return true;
    } catch (error) {
      throw new InternalServerErrorException('비밀번호 업데이트 실패');
    }
  }

  async verifyLocalAuth(userId: number, password: string): Promise<boolean> {
    const localAuth = await this.localAuthRepository.findOne({
      where: { user_id: userId },
    });
    if (!localAuth?.password) return false;
    return bcrypt.compare(password, localAuth.password);
  }

  async createLocalAuth(userId: number, password: string) {
    try {
      const hashPw = await bcrypt.hash(password, HASH_ROUND);

      await this.localAuthRepository.insert({
        user_id: userId,
        password: hashPw,
      });
      return true;
    } catch (error) {
      throw new InternalServerErrorException('LocalAuth 생성 실패');
    }
  }

  async getLocalAuth(
    userId: number,
    select?: FindOptionsSelect<LocalAuth>,
  ): Promise<LocalAuth | null> {
    const localAuth = await this.localAuthRepository.findOne({
      where: { user_id: userId },
      select,
    });
    return localAuth;
  }

  async getUserWithSocialAuthList(userId: number): Promise<SocialAuth[]> {
    const socialAuths = await this.socialAuthRepository.find({
      where: { user_id: userId },
    });
    return socialAuths;
  }

  async getSocialAuth(
    where: FindOptionsWhere<SocialAuth>,
    relations?: FindOptionsRelations<SocialAuth>,
    select?: FindOptionsSelect<SocialAuth>,
  ): Promise<SocialAuth | null> {
    const found = await this.socialAuthRepository.findOne({
      where,
      relations,
      select,
    });

    return found;
  }

  async deleteSocialAuth(userId: number, provider: SocialProvider) {
    await this.socialAuthRepository.delete({ user_id: userId, provider });
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
    socialAuthData: Omit<CreateSocialAuthDto, 'userId'>,
    userId: number,
  ): Promise<boolean> {
    const { sub, provider, providerEmail, isPrimary } = socialAuthData;

    try {
      await this.socialAuthRepository.insert({
        sub,
        provider,
        user_id: userId,
        provider_email: providerEmail,
        is_primary: isPrimary,
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException('소셜 유저 생성 실패');
    }
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
