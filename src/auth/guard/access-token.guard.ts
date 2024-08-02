import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new BadRequestException('토큰 없음');
    }
    const token = this.authService.extractTokenFromHeader(authHeader);
    const payload = await this.authService.verifyToken(token, false);
    const user = await this.authService.getUser({ email: payload.email });

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    if (req.tokenType !== 'ac') {
      throw new UnauthorizedException('access-token이 아님');
    }

    return true;
  }
}
