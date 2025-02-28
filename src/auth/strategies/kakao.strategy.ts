import { Injectable } from '@nestjs/common';
import { BaseOAuthStrategy } from './base-oauth.strategy';
import { SocialProvider } from 'src/const/auth.const';
import { IKakaoOAuthUserInfo, ISocialUserInfo } from 'src/types/auth.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoOAuthStrategy extends BaseOAuthStrategy {
  constructor(configService: ConfigService) {
    super(
      SocialProvider.KAKAO,
      configService,
      'https://kauth.kakao.com/oauth/authorize',
      'https://kauth.kakao.com/oauth/token',
      'https://kapi.kakao.com/v2/user/me',
      ['account_email', 'profile_nickname'],
    );
  }

  async getUserInfo(accessToken: string): Promise<ISocialUserInfo> {
    const response = await fetch(this.userInfoUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data: IKakaoOAuthUserInfo = await response.json();

    return {
      sub: data.id.toString(),
      email: data.kakao_account.email,
    };
  }
}
