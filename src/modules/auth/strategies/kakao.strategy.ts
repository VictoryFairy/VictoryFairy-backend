import { Injectable } from '@nestjs/common';
import { SocialProvider, TFlowType } from 'src/modules/auth/const/auth.const';
import {
  IKakaoOAuthUserInfo,
  ISocialUserInfo,
} from 'src/modules/auth/strategies/interface/oauth.interface';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthStrategy } from './base-oauth.strategy';
import { IDotenv } from 'src/core/config/dotenv.interface';

@Injectable()
export class KakaoOAuthStrategy extends BaseOAuthStrategy {
  constructor(configService: ConfigService<IDotenv>) {
    super(
      SocialProvider.KAKAO,
      configService,
      'https://kauth.kakao.com/oauth/authorize',
      'https://kauth.kakao.com/oauth/token',
      'https://kapi.kakao.com/v2/user/me',
      ['account_email', 'profile_nickname'],
    );
  }
  getCodeAuthUrl(flowType: TFlowType, state: string): string {
    const url = new URL(this.authUrl);
    const callbackUri = this.getCallbackUri(flowType);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: callbackUri,
      response_type: 'code',
      scope: this.scope.join(' '),
      state,
    });

    url.search = params.toString();
    return url.href;
  }

  getCallbackUri(flowType: TFlowType): string {
    return new URL(
      `auth/${flowType}/${this.provider}/callback`,
      this.configService.get<string>('BACK_END_URL'),
    ).href;
  }

  async getAccessToken(code: string, callbackUri: string): Promise<string> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUri,
      }),
    });
    const data = await response.json();
    return data.access_token;
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

  async validateAndGetUserInfo(
    code: string,
    flowType: TFlowType,
  ): Promise<ISocialUserInfo> {
    const callbackUri = this.getCallbackUri(flowType);
    const accessToken = await this.getAccessToken(code, callbackUri);
    return await this.getUserInfo(accessToken);
  }
}
