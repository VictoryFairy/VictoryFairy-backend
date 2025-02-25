import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IJwtPayload } from 'src/types/auth.type';
import { MailService } from 'src/services/mail.service';
import { createRandomCode } from 'src/utils/random-code.util';
import { CODE_LENGTH, SocialProvider } from 'src/const/auth.const';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { EmailWithCodeDto, LoginUserDto } from 'src/dtos/user.dto';
import { RedisCachingService } from '../services/redis-caching.service';
import { OAuthStrategy } from './strategies/base-oauth.strategy';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { DEFAULT_PROFILE_IMAGE } from 'src/const/user.const';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SocialAuth)
    private readonly socialAuthRepository: Repository<SocialAuth>,
    private readonly redisCachingService: RedisCachingService,
    @Inject('OAUTH_STRATEGIES')
    private readonly oAuthStrategies: Record<SocialProvider, OAuthStrategy>,
  ) {}

  async loginLocalUser(dto: LoginUserDto) {
    const user = await this.getUser(
      { email: dto.email },
      { support_team: true, local_auth: true },
      {
        id: true,
        email: true,
        local_auth: { password: true },
        support_team: { id: true, name: true },
      },
    );

    if (!user || !user.local_auth) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 틀림');
    }
    const isCorrectPw = await bcrypt.compare(
      dto.password,
      user.local_auth.password,
    );
    if (!isCorrectPw) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 틀림');
    }
    const { id, email } = user;
    const [rfToken, acToken] = [
      this.issueToken({ id, email }, true),
      this.issueToken({ id, email }, false),
    ];
    return { user, rfToken, acToken };
  }
  async loginSocialUser(sub: string, email: string, provider: SocialProvider) {
    let foundUser = null;
    foundUser = await this.socialAuthRepository.findOne({
      where: { sub, provider },
      relations: { user: true },
      select: { user: { email: true, id: true } },
    });

    if (!foundUser) {
      // 회원가입처리
      const isExistEmail = await this.userRepository.findOne({
        where: { email },
        select: { id: true, email: true },
      });
      if (isExistEmail) {
        await this.socialAuthRepository.insert({
          user_id: isExistEmail.id,
          provider,
          sub,
        });
        foundUser = await this.socialAuthRepository.findOne({
          where: { sub, provider },
          relations: { user: true },
          select: { user: { email: true, id: true } },
        });
      } else {
        const randomNum = Math.floor(Math.random() * 10000);
        const nickname = `승리요정#${randomNum.toString().padStart(4, '0')}`;
        const userObj = {
          email,
          nickname,
          profile_image: DEFAULT_PROFILE_IMAGE,
        };
        const createdUser = await this.userRepository.save(userObj);
        await this.socialAuthRepository.insert({
          user_id: createdUser.id,
          provider,
          sub,
        });
        foundUser = await this.socialAuthRepository.findOne({
          where: { sub, provider },
          relations: { user: true },
          select: { user: { email: true, id: true } },
        });
      }
    }

    const { id, email: userEmail } = foundUser.user;

    const [rfToken, acToken] = [
      this.issueToken({ id, email: userEmail }, true),
      this.issueToken({ id, email: userEmail }, false),
    ];
    return { user: foundUser, rfToken, acToken };
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

  async getUser(
    whereOpt: FindOptionsWhere<User>,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ) {
    const findUser = await this.userRepository.findOne({
      where: whereOpt,
      relations,
      select,
    });
    if (!findUser) {
      throw new UnauthorizedException('해당 유저를 찾을 수 없음');
    }
    return findUser;
  }
}
