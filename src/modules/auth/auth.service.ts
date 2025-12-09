import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/infra/mail/mail.service';
import { createRandomCode } from 'src/common/utils/random-code.util';
import { CODE_LENGTH, SocialProvider } from 'src/modules/auth/const/auth.const';
import { v7 as uuidv7 } from 'uuid';
import { AuthRedisService } from './auth-redis.service';
import { IOAuthStateCachingData } from 'src/modules/auth/strategies/interface/oauth.interface';
import { IJwtPayload } from './types/auth.type';
import { EmailWithCodeDto } from '../account/dto/request/req-email-user.dto';
import { IDotenv } from 'src/config/dotenv.interface';

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessExpireTime: string;
  private readonly refreshExpireTime: string;
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<IDotenv>,
    private readonly mailService: MailService,
    private readonly authRedisService: AuthRedisService,
  ) {
    this.jwtAccessSecret = this.configService.get('JWT_ACCESS_SECRET', {
      infer: true,
    });
    this.jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET', {
      infer: true,
    });
    this.accessExpireTime = this.configService.get('ACCESS_EXPIRE_TIME', {
      infer: true,
    });
    this.refreshExpireTime = this.configService.get('REFRESH_EXPIRE_TIME', {
      infer: true,
    });
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
      type === 'refresh' ? this.jwtRefreshSecret : this.jwtAccessSecret;
    const exTime =
      type === 'refresh' ? this.refreshExpireTime : this.accessExpireTime;
    return this.jwtService.sign(
      { ...payload, type: type === 'refresh' ? 'rf' : 'ac' },
      { secret, expiresIn: Number(exTime) },
    );
  }

  async saveOAuthStateWithUser(data: {
    provider: SocialProvider;
    userId?: number;
  }): Promise<{ state: string }> {
    const state = uuidv7();
    await this.authRedisService.saveOAuthState({ ...data, state });
    return { state };
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
