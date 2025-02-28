import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IJwtPayload } from 'src/types/auth.type';
import { MailService } from 'src/services/mail.service';
import { createRandomCode } from 'src/utils/random-code.util';
import {
  CODE_LENGTH,
  SocialLoginStatus,
  SocialProvider,
} from 'src/const/auth.const';
import { EmailWithCodeDto, LoginLocalUserDto } from 'src/dtos/user.dto';
import { RedisCachingService } from '../services/redis-caching.service';
import { AccountService } from 'src/account/account.service';
import { User } from 'src/entities/user.entity';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly redisCachingService: RedisCachingService,
    @Inject('OAUTH_STRATEGIES')
    private readonly oAuthStrategies: Record<SocialProvider, IOAuthStrategy>,
  ) {}

  async loginLocalUser(dto: LoginLocalUserDto) {
    const { email, password } = dto;
    const user = await this.accountService.getUser(
      { email },
      { support_team: true },
    );

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }

    const isVerified = await this.accountService.verifyLocalAuth(
      user.id,
      password,
    );
    if (!isVerified) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }

    const acToken = this.issueToken({ email, id: user.id }, false);
    const rfToken = this.issueToken({ email, id: user.id }, true);

    return { acToken, rfToken, user };
  }

  @Transactional()
  async loginSocialUser(sub: string, email: string, provider: SocialProvider) {
    let user: User | null;
    const socialAuth = await this.accountService.findSocialAuth(
      { sub, provider },
      { user: true },
      { user: { id: true, email: true } },
    );
    user = socialAuth?.user ?? null;

    if (!user) {
      const isExistUser = await this.accountService.getUser(
        { email },
        {},
        { id: true, email: true },
      );
      // 동일 이메일이 이미 가입된 경우
      if (isExistUser) {
        await this.accountService.createSocialAuth({
          sub,
          provider,
          user_id: isExistUser.id,
        });
        user = isExistUser;
      } else {
        //없는 경우
        user = await this.accountService.createSocialUser(
          { email },
          { sub, provider },
        );
      }
    }

    const rfToken = this.issueToken({ email: user.email, id: user.id }, true);
    const acToken = this.issueToken({ email, id: user.id }, false);
    return { acToken, rfToken, user };
  }

  getSocialAuthCallbackUrl(provider: SocialProvider) {
    const strategy = this.oAuthStrategies[provider];
    if (!strategy) {
      throw new BadRequestException('해당 프로바이더 소셜 로그인 기능 없음');
    }
    return strategy.getAuthUrl();
  }

  async getSocialUserInfo(provider: SocialProvider, code: string) {
    const strategy = this.oAuthStrategies[provider];
    if (!strategy) {
      throw new BadRequestException('해당 프로바이더 소셜 로그인 기능 없음');
    }
    const accessToken = await strategy.getAccessToken(code);
    const userInfoFromProvider = await strategy.getUserInfo(accessToken);
    return userInfoFromProvider;
  }

  async makeCodeAndSendMail(email: string) {
    const code = createRandomCode(CODE_LENGTH);
    const result = await this.mailService.sendAuthCodeMail(email, code);
    if (!result) {
      throw new InternalServerErrorException('이메일 전송 실패');
    }
    await this.redisCachingService.cachingVerificationCode(email, code);
    return result;
  }

  async verifyEmailCode(dto: EmailWithCodeDto) {
    const { code, email } = dto;
    const getCachedCode =
      await this.redisCachingService.getCachedVerificationCode(email);
    if (!getCachedCode || getCachedCode !== code) {
      throw new UnauthorizedException('인증 코드 틀림');
    }
    await this.redisCachingService.deleteVerificationCode(email);

    return true;
  }

  issueToken(payload: Pick<IJwtPayload, 'id' | 'email'>, isRefresh: boolean) {
    const rfKey = this.configService.get<string>('JWT_REFRESH_SECRET');
    const acKey = this.configService.get<string>('JWT_ACCESS_SECRET');
    const rfExTime = this.configService.get<string>('REFRESH_EXPIRE_TIME');
    const acExTime = this.configService.get<string>('ACCESS_EXPIRE_TIME');
    if (isRefresh) {
      return this.jwtService.sign(
        { ...payload, type: 'rf' },
        {
          secret: rfKey,
          expiresIn: parseInt(rfExTime),
        },
      );
    } else {
      return this.jwtService.sign(
        { ...payload, type: 'ac' },
        {
          secret: acKey,
          expiresIn: parseInt(acExTime),
        },
      );
    }
  }

  async verifyToken(token: string, isRefresh: boolean) {
    const rfKey = this.configService.get<string>('JWT_REFRESH_SECRET');
    const acKey = this.configService.get<string>('JWT_ACCESS_SECRET');
    const secretKey = isRefresh ? rfKey : acKey;
    try {
      const result: IJwtPayload = await this.jwtService.verifyAsync(token, {
        secret: secretKey,
      });
      return result;
    } catch (error) {
      if (isRefresh) {
        throw new UnauthorizedException('다시 로그인 해주세요');
      } else {
        throw new UnauthorizedException('유효하지 않은 토큰');
      }
    }
  }

  extractTokenFromHeader(authHeader: string) {
    const splitToken = authHeader.split(' ');
    if (splitToken.length !== 2 || splitToken[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('잘못된 토큰');
    }
    const token = splitToken[1];
    return token;
  }
}
