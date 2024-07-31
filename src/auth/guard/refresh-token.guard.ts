import {
  BadRequestException,
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

    if (!req.cookies) {
      throw new BadRequestException('쿠키가 없습니다.');
    }

    const token = req.cookies.refreshToken;

    if (!token) {
      throw new BadRequestException(
        '리프레쉬 토큰 없음. 다시 로그인 해주세요.',
      );
    }

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
