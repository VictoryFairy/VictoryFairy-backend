import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from 'src/modules/auth/types/auth.type';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { UserService } from 'src/modules/user/user.service';
import { IDotenv } from 'src/core/config/dotenv.interface';

@Injectable()
export class JwtStrategy {
  private readonly refreshSecret: string;
  private readonly accessSecret: string;
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<IDotenv>,
    private readonly userRedisService: UserRedisService,
    private readonly userService: UserService,
  ) {
    this.refreshSecret = this.configService.get('JWT_REFRESH_SECRET', {
      infer: true,
    });
    this.accessSecret = this.configService.get('JWT_ACCESS_SECRET', {
      infer: true,
    });
  }

  async validateToken(token: string, type: 'refresh' | 'access') {
    try {
      const secret =
        type === 'refresh' ? this.refreshSecret : this.accessSecret;
      const payload: IJwtPayload = await this.jwtService.verifyAsync(token, {
        secret,
      });
      return payload;
    } catch (err) {
      throw new UnauthorizedException('토큰 검증 실패');
    }
  }

  async checkUser(
    userId: number,
  ): Promise<{ id: number; nickname: string; profile_image: string }> {
    let user = await this.userRedisService.getUserInfoById(userId);
    if (!user) {
      const dbUser = await this.userService.getUser({ id: userId });
      user = {
        id: dbUser.id,
        nickname: dbUser.nickname,
        profile_image: dbUser.profile_image,
      };
    }
    return user;
  }
}
