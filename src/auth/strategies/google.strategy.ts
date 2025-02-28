import { Injectable } from '@nestjs/common';
import { BaseOAuthStrategy } from './base-oauth.strategy';
import { SocialProvider } from 'src/const/auth.const';
import { IGoogleOAuthUserInfo, ISocialUserInfo } from 'src/types/auth.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleOAuthStrategy extends BaseOAuthStrategy {
  constructor(configService: ConfigService) {
    super(
      SocialProvider.GOOGLE,
      configService,
      'https://accounts.google.com/o/oauth2/v2/auth',
      'https://oauth2.googleapis.com/token',
      'https://www.googleapis.com/oauth2/v2/userinfo',
      ['email', 'profile'],
    );
  }

  async getUserInfo(accessToken: string): Promise<ISocialUserInfo> {
    const response = await fetch(this.userInfoUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data: IGoogleOAuthUserInfo = await response.json();
    return {
      sub: data.id,
      email: data.email,
    };
  }
}
