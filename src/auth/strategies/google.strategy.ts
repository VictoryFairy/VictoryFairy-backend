import { Injectable } from '@nestjs/common';
import { SocialProvider, TFlowType } from 'src/const/auth.const';
import { IGoogleOAuthUserInfo, ISocialUserInfo } from 'src/types/auth.type';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthStrategy } from './base-oauth.strategy';

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

    const data: IGoogleOAuthUserInfo = await response.json();
    return {
      sub: data.id,
      email: data.email,
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
