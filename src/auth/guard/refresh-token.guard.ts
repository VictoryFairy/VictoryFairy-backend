import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserService } from 'src/services/user.service';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    if (!req.cookies?.token) {
      throw new UnauthorizedException('리프레시 토큰이 없음. 재로그인 필요');
    }

    const token = req.cookies.token;

    const payload = await this.authService.verifyToken(token, true);
    const user = await this.userService.findUserByEmail(payload.email);

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    if (req.tokenType !== 'rf') {
      throw new UnauthorizedException('refresh-token이 아님');
    }

    return true;
  }
}
