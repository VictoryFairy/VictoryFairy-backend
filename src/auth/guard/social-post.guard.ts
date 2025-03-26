import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuthStrategyManager } from '../strategies/OAuthStrategyManager';
import { AuthService } from '../auth.service';
import { OAUTH_STRATEGY_MANAGER, SocialProvider } from 'src/const/auth.const';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SocialPostGuard implements CanActivate {
  constructor(
    @Inject(OAUTH_STRATEGY_MANAGER)
    private readonly oAuthStrategyManager: OAuthStrategyManager,
    private readonly authService: AuthService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const provider = req.params.provider as SocialProvider;
    const pid = req.body?.pid;
    const flowType = req.url.includes('link') ? 'link' : 'login';

    if (!provider || !Object.values(SocialProvider).includes(provider)) {
      throw new BadRequestException('유효하지 않은 provider');
    }
    if (!pid) {
      throw new BadRequestException('pid 누락');
    }

    const strategy = this.oAuthStrategyManager.getStrategy(provider);
    const code = await this.authService.getCodeByPid(pid);
    if (!code) throw new UnauthorizedException('code 만료 또는 없음');

    const socialUserInfo = await strategy.validateAndGetUserInfo(
      code,
      flowType,
    );
    req.socialUserInfo = socialUserInfo;

    return true;
  }
}
