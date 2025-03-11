import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from 'src/types/auth.type';

@Injectable()
export class JwtStrategy {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateTokenAndGetUser(token: string, type: 'refresh' | 'access') {
    try {
      const secret =
        type === 'refresh'
          ? this.configService.get('JWT_REFRESH_SECRET')
          : this.configService.get('JWT_ACCESS_SECRET');
      const payload: IJwtPayload = await this.jwtService.verifyAsync(token, {
        secret,
      });
      const user = await this.authService.getUserForAuth(payload.id);
      if (!user) {
        throw new UnauthorizedException('유효하지 않은 사용자입니다.');
      }

      return { user, payload };
    } catch (err) {
      throw new UnauthorizedException('토큰 검증 실패');
    }
  }
}
