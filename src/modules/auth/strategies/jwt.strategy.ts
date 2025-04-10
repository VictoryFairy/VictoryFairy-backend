import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from 'src/modules/auth/types/auth.type';
import { UserRedisService } from 'src/core/redis/user-redis.service';

@Injectable()
export class JwtStrategy {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRedisService: UserRedisService,
  ) {}

  async validateToken(token: string, type: 'refresh' | 'access') {
    try {
      const secret =
        type === 'refresh'
          ? this.configService.get('JWT_REFRESH_SECRET')
          : this.configService.get('JWT_ACCESS_SECRET');
      const payload: IJwtPayload = await this.jwtService.verifyAsync(token, {
        secret,
      });
      return payload;
    } catch (err) {
      throw new UnauthorizedException('토큰 검증 실패');
    }
  }

  async checkUser(userId: number) {
    let user = await this.userRedisService.getUserInfoById(userId);
    if (!user) {
      const dbUser = await this.authService.getUserForAuth(userId);
      user = {
        id: dbUser.id,
        nickname: dbUser.nickname,
        profile_image: dbUser.profile_image,
      };
    }
    return user;
  }

  async validateTokenAndGetUser(token: string, type: 'refresh' | 'access') {
    const payload = await this.validateToken(token, type);
    const user = await this.authService.getUserForAuth(payload.id);
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    return { user, payload };
  }
}
