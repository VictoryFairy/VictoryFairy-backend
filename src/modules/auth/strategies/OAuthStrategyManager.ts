import { BadRequestException, Injectable } from '@nestjs/common';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { IOAuthStrategy } from 'src/modules/auth/strategies/interface/oauth.interface';
import { GoogleOAuthStrategy } from './google.strategy';
import { KakaoOAuthStrategy } from './kakao.strategy';
import { AppleOAuthStrategy } from './apple.strategy';

@Injectable()
export class OAuthStrategyManager {
  private readonly strategies: Record<SocialProvider, IOAuthStrategy>;

  constructor(
    google: GoogleOAuthStrategy,
    kakao: KakaoOAuthStrategy,
    apple: AppleOAuthStrategy,
  ) {
    this.strategies = {
      [SocialProvider.GOOGLE]: google,
      [SocialProvider.KAKAO]: kakao,
      [SocialProvider.APPLE]: apple,
    };
  }
  getStrategy(provider: SocialProvider): IOAuthStrategy {
    const strategy = this.strategies[provider];
    if (!strategy) {
      throw new BadRequestException(
        `지원하지 않는 소셜 로그인 플랫폼: ${provider}`,
      );
    }
    return strategy;
  }
}
