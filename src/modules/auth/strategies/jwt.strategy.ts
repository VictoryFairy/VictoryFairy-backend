import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from 'src/modules/auth/types/auth.type';
import { IDotenv } from 'src/core/config/dotenv.interface';
import { UserRedisService } from 'src/modules/account/core/user-redis.service';
import { AccountCoreService } from 'src/modules/account/core/account-core.service';

@Injectable()
export class JwtStrategy {
  private readonly refreshSecret: string;
  private readonly accessSecret: string;
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<IDotenv>,
    private readonly userRedisService: UserRedisService,
    private readonly accountCoreService: AccountCoreService,
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
    const result = await this.userRedisService.getUserInfoByIds([userId]);
    let user = result ? result[userId.toString()] : null;
    if (!user) {
      const foundUser = await this.accountCoreService.getUserById(userId);
      const { id, nickname, profile_image } = foundUser;
      user = { id, nickname, profile_image };
    }
    return user;
  }
}
