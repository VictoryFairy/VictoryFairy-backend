import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtStrategy: JwtStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('토큰 없음');
    }

    const [prefix, token] = authHeader.split(' ');

    if (prefix.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('토큰 형식 오류');
    }

    const payload = await this.jwtStrategy.validateToken(token, 'access');
    const user = await this.jwtStrategy.checkUser(payload.id);

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    req.user = { ...user, email: payload.email };
    req.tokenType = payload.type;

    if (req.tokenType !== 'ac') {
      throw new UnauthorizedException('access-token이 아님');
    }

    return true;
  }
}
