import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountService } from 'src/account/account.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly accountService: AccountService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('토큰 없음');
    }
    const token = this.accountService.extractTokenFromHeader(authHeader);
    const payload = await this.accountService.verifyToken(token, false);
    const user = await this.accountService.getUser(
      { email: payload.email },
      { support_team: true },
    );

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    if (req.tokenType !== 'ac') {
      throw new UnauthorizedException('access-token이 아님');
    }

    return true;
  }
}
