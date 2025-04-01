import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  OAUTH_STRATEGY_MANAGER,
  SocialProvider,
  TFlowType,
} from 'src/const/auth.const';
import { OAuthStrategyManager } from '../strategies/OAuthStrategyManager';
import { IOAuthStrategy } from 'src/types/auth.type';
import { URL } from 'url';
import { AuthService } from '../auth.service';
import { Request, Response } from 'express';

@Injectable()
export class SocialAuthGuard implements CanActivate {
  private readonly logger = new Logger(SocialAuthGuard.name);
  constructor(
    @Inject(OAUTH_STRATEGY_MANAGER)
    private readonly oAuthStrategyManager: OAuthStrategyManager,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const { provider, strategy, receivedUrl, flowType, code } =
      this.extractRequestInfo(req);

    if (!this.isCallbackRequest(receivedUrl, code)) {
      await this.handleEntryPoint(req, res, provider, strategy, flowType);
      // 엔트리포인트는 바로 로그인 창으로 리다이렉트 하니까 가드 false로 컨트롤러 진입 안하도록
      return false;
    }

    // 콜백 처리 시 애플은 POST 요청만 받고, 그 외의 소셜 로그인은 GET 요청만 받음
    if (
      (provider === SocialProvider.APPLE && req.method !== 'POST') ||
      (provider !== SocialProvider.APPLE && req.method !== 'GET')
    ) {
      const msg =
        provider === SocialProvider.APPLE
          ? '애플 로그인은 POST 요청만 가능'
          : '그 외의 소셜 로그인은 GET 요청만 가능';
      throw new BadRequestException(msg);
    }
    // 소셜 로그인 콜백 처리 - uuid및 코드 캐싱 후 프론트엔드로 리다이렉트
    await this.handleCallback(req, code, flowType, receivedUrl);
    return true;
  }

  private extractRequestInfo(req: any) {
    const provider = req.params.provider as SocialProvider;
    const strategy = this.oAuthStrategyManager.getStrategy(provider);

    const receivedUrl = new URL(
      req.originalUrl,
      `${req.protocol}://${req.hostname}`,
    );
    const flowType: TFlowType = receivedUrl.pathname.includes(
      `/${TFlowType.LINK}`,
    )
      ? TFlowType.LINK
      : TFlowType.LOGIN;

    const code =
      provider === SocialProvider.APPLE && req.method === 'POST'
        ? // 애플은 코드를 body에 담아서 보냄
          req.body?.code || null
        : receivedUrl.searchParams.get('code') || null;

    return { provider, strategy, receivedUrl, flowType, code };
  }

  /** 진입점 또는 콜백 받는 엔드포인트지 확인 */
  private isCallbackRequest(receivedUrl: URL, code: string | null): boolean {
    return !!(code && receivedUrl.pathname.includes('/callback'));
  }

  /** 소셜 로그인 or 연동인지 확인 후 리다이렉트 uri생성 및 리다이렉트 */
  private async handleEntryPoint(
    req: any,
    res: Response,
    provider: SocialProvider,
    strategy: IOAuthStrategy,
    flowType: 'link' | 'login',
  ) {
    const { state } = await this.authService.saveOAuthStateWithUser({
      provider,
      userId: req.user?.id,
    });
    const codeAuthUrl = strategy.getCodeAuthUrl(flowType, state);

    res.redirect(codeAuthUrl);
  }

  /** sns플랫폼에서 받은 콜백 처리 - 소셜 플랫폼 제공 유저 req에 넣기 */
  private async handleCallback(
    req: Request,
    code: string,
    flowType: 'link' | 'login',
    receivedUrl: URL,
  ): Promise<void> {
    const receivedState =
      receivedUrl.searchParams.get('state') || req.body?.state;
    if (!receivedState) {
      this.logger.error('OAuth state정보 누락');
      req.socialAuthError = true;

      return;
    }

    const result = await this.authService.getOAuthStateData(receivedState);

    if (!result.state) {
      this.logger.error('OAuth state 없거나 일치하지 않음');
      req.socialAuthError = true;
      return;
    }

    const reqIp = req.extractedIp;

    const pid = await this.authService.createUuidAndCachingCode(code, reqIp);
    if (!pid) {
      req.socialAuthError = true;
      return;
    }
    req.socialAuthError = false;
    req.flowType = flowType;
    req.pid = pid;
    return;
  }
}
