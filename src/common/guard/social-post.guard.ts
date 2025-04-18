import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  OAUTH_STRATEGY_MANAGER,
  SocialProvider,
} from 'src/modules/auth/const/auth.const';
import { AuthService } from 'src/modules/auth/auth.service';
import { OAuthStrategyManager } from 'src/modules/auth/strategies/OAuthStrategyManager';

@Injectable()
export class SocialPostGuard implements CanActivate {
  constructor(
    @Inject(OAUTH_STRATEGY_MANAGER)
    private readonly oAuthStrategyManager: OAuthStrategyManager,
    private readonly authService: AuthService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();

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
    const codeWithIp = await this.authService.getCodeByPid(pid);

    if (!codeWithIp) {
      throw new UnauthorizedException('code 만료 또는 없음');
    }
    if (req.extractedIp !== codeWithIp.ip) {
      throw new UnauthorizedException('동일한 사용자 아님');
    }
    const socialUserInfo = await strategy.validateAndGetUserInfo(
      codeWithIp.code,
      flowType,
    );
    req.socialUserInfo = socialUserInfo;

    return true;
  }
}
