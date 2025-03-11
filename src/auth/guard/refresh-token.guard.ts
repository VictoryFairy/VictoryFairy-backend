import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly jwtStrategy: JwtStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies['token'];
    if (!token) {
      throw new UnauthorizedException('토큰 없음');
    }

    const { user, payload } = await this.jwtStrategy.validateTokenAndGetUser(
      token,
      'refresh',
    );

    if (!user) {
      throw new UnauthorizedException('유저 정보 조회 실패');
    }

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    if (req.tokenType !== 'rf') {
      throw new UnauthorizedException('refresh-token이 아님');
    }

    return true;
  }
}
