import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountService } from 'src/account/account.service';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly accountService: AccountService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies['token'];
    if (!token) {
      throw new UnauthorizedException('토큰 없음');
    }

    const payload = await this.accountService.verifyToken(token, true);
    const user = await this.accountService.getUser(
      { email: payload.email },
      { support_team: true },
    );

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    if (req.tokenType !== 'rf') {
      throw new UnauthorizedException('refresh-token이 아님');
    }

    return true;
  }
}
