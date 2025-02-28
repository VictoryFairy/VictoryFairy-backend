import { Injectable } from '@nestjs/common';
import { SocialProvider } from 'src/const/auth.const';
import { IOAuthStrategy } from './base-oauth.strategy';
import { GoogleOAuthStrategy } from './google.strategy';
import { KakaoOAuthStrategy } from './kakao.strategy';

@Injectable()
export class OAuthStrategyManager {
  private readonly strategies: Record<SocialProvider, IOAuthStrategy>;

  constructor(google: GoogleOAuthStrategy, kakao: KakaoOAuthStrategy) {
    this.strategies = {
      [SocialProvider.GOOGLE]: google,
      [SocialProvider.KAKAO]: kakao,
    };
  }
  getStrategy(provider: SocialProvider): IOAuthStrategy {
    const strategy = this.strategies[provider];
    if (!strategy) {
      throw new Error(`지원하지 않는 소셜 로그인 플랫폼: ${provider}`);
    }
    return strategy;
  }
}
