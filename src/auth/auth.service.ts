import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { UserService } from 'src/services/user.service';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from 'src/dtos/login-user.dto';
import { IJwtPayload } from 'src/types/auth.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerUser(dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  async loginUser(dto: LoginUserDto) {
    const user = await this.userService.findUserByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('이메일 확인해주세요');
    }
    const isCorrectPw = await bcrypt.compare(dto.password, user.password);
    if (!isCorrectPw) {
      throw new BadRequestException('비밀번호 화인해주세요');
    }
    const { id, email } = user;
    const rfToken = this.issueToken({ id, email }, true);
    const acToken = this.issueToken({ id, email }, false);
    return { rfToken, acToken };
  }

  issueToken(payload: Pick<IJwtPayload, 'id' | 'email'>, isRefresh: boolean) {
    if (isRefresh) {
      const rfKey = this.configService.get<string>('JWT_REFRESH_SECRET');
      const rfExTime = this.configService.get('REFRESH_EXPIRE_TIME');
      return this.jwtService.sign(
        { ...payload, type: 'rf' },
        {
          secret: rfKey,
          expiresIn: parseInt(rfExTime),
        },
      );
    } else {
      const acKey = this.configService.get<string>('JWT_ACCESS_SECRET');
      const acExTime = this.configService.get('ACCESS_EXPIRE_TIME');
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
      const result: IJwtPayload = await this.jwtService.verify(token, {
        secret: secretKey,
      });
      return result;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰');
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
