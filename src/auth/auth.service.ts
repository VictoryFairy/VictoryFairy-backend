import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IJwtPayload } from 'src/types/auth.type';
import { Redis } from 'ioredis';
import { MailService } from 'src/services/mail.service';
import { createRandomCode } from 'src/utils/random-code.util';
import { CODE_LENGTH, CODE_LIMIT_TIME } from 'src/const/auth.const';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { EmailWithCodeDto, LoginUserDto } from 'src/dtos/user-dto';
import { RedisKeys } from 'src/const/redis.const';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async loginUser(dto: LoginUserDto) {
    const user = await this.getUser(
      { email: dto.email },
      { support_team: true },
    );
    if (!user) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 틀림');
    }
    const isCorrectPw = await bcrypt.compare(dto.password, user.password);
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

  async makeCodeAndSendMail(email: string) {
    const code = createRandomCode(CODE_LENGTH);
    const result = await this.mailService.sendAuthCodeMail(email, code);
    if (!result) {
      throw new InternalServerErrorException('이메일 전송 실패');
    }
    try {
      await this.redisClient.set(
        `${RedisKeys.EMAIL_CODE}:${email}`,
        code,
        'EX',
        CODE_LIMIT_TIME,
      );
      return result;
    } catch (error) {
      throw new InternalServerErrorException('레디스 저장 실패');
    }
  }

  async verifyEmailCode(dto: EmailWithCodeDto) {
    const { code, email } = dto;
    const getCachedCode = await this.redisClient.get(
      `${RedisKeys.EMAIL_CODE}:${email}`,
    );
    if (!getCachedCode || getCachedCode !== code) {
      throw new UnauthorizedException('인증 코드 틀림');
    }
    try {
      await this.redisClient.del(`${RedisKeys.EMAIL_CODE}:${email}`);
    } catch (error) {
      throw new InternalServerErrorException('레디스 삭제 실패');
    }

    return true;
  }

  issueToken(payload: Pick<IJwtPayload, 'id' | 'email'>, isRefresh: boolean) {
    const { rfKey, rfExTime, acKey, acExTime } = this.getEnv();
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
    const { rfKey, acKey } = this.getEnv();
    const secretKey = isRefresh ? rfKey : acKey;
    try {
      const result: IJwtPayload = await this.jwtService.verify(token, {
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
  ) {
    const findUser = await this.userRepository.findOne({
      where: whereOpt,
      relations,
    });
    if (!findUser) {
      throw new UnauthorizedException('해당 유저를 찾을 수 없음');
    }
    return findUser;
  }

  /** 환경변수 게터 함수 */
  private getEnv() {
    const rfKey = this.configService.get<string>('JWT_REFRESH_SECRET');
    const acKey = this.configService.get<string>('JWT_ACCESS_SECRET');
    const rfExTime = this.configService.get<string>('REFRESH_EXPIRE_TIME');
    const acExTime = this.configService.get<string>('ACCESS_EXPIRE_TIME');
    return { rfExTime, rfKey, acKey, acExTime };
  }
}
