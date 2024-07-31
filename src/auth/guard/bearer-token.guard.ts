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
class BaseBearTokenGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new BadRequestException('토큰 없음');
    }
    const token = this.authService.extractTokenFromHeader(authHeader);
    const payload = await this.authService.verifyToken(token, false);
    const user = await this.userService.findUserByEmail(payload.email);

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    return true;
  }
}

@Injectable()
export class AccessTokenGuard extends BaseBearTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest();

    if (req.tokenType !== 'ac') {
      throw new UnauthorizedException('유효한 토큰이 아님');
    }

    return true;
  }
}

@Injectable()
export class RefreshTokenGuard extends BaseBearTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest();

    if (req.tokenType != 'rf') {
      throw new UnauthorizedException('유효한 토큰이 아님');
    }
    return true;
  }
}
