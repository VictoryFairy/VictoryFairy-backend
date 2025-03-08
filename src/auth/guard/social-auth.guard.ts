import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class SocialAuthGuard implements CanActivate {
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

    // 소셜 로그인 콜백 처리
    if (
      (provider === SocialProvider.APPLE && req.method !== 'POST') ||
      (provider !== SocialProvider.APPLE && req.method !== 'GET')
    ) {
      const msg =
        provider === SocialProvider.APPLE
          ? '애플 로그인은 POST 요청만 가능'
          : '그외의 소셜 로그인은 GET 요청만 가능';
      throw new BadRequestException(msg);
    }
    await this.handleCallback(req, code, flowType, strategy, receivedUrl);
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
    res: any,
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
    req: any,
    code: string,
    flowType: 'link' | 'login',
    strategy: IOAuthStrategy,
    receivedUrl: URL,
  ): Promise<void> {
    const receivedState = receivedUrl.searchParams.get('state');
    if (!receivedState) {
      throw new BadRequestException('OAuth state정보 누락');
    }

    const { state, userId, provider } =
      await this.authService.getOAuthStateData(receivedState);

    if (!state) {
      throw new BadRequestException('OAuth state 일치하지 않음');
    }
    try {
      const socialUserInfo = await strategy.validateAndGetUserInfo(
        code,
        flowType,
      );

      req.socialUserInfo = socialUserInfo;
      req.cachedUser = { id: userId, provider };
    } catch (error) {
      throw new InternalServerErrorException(
        '소셜 로그인 처리 중 오류가 발생했습니다',
      );
    }
  }
}
