import { Injectable } from '@nestjs/common';
import { OAuthStrategy } from './base-oauth.strategy';
import { SocialProvider } from 'src/const/auth.const';
import { IKakaoOAuthUserInfo, ISocialUserInfo } from 'src/types/auth.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoOAuthStrategy implements OAuthStrategy {
  provider: SocialProvider = SocialProvider.KAKAO;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private authUrl = 'https://kauth.kakao.com/oauth/authorize';
  private tokenUrl = 'https://kauth.kakao.com/oauth/token';
  private userInfoUrl = 'https://kapi.kakao.com/v2/user/me';
  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('KAKAO_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'KAKAO_CLIENT_SECRET',
      '',
    );
    this.redirectUri = new URL(
      `auth/${this.provider}/callback`,
      this.configService.get<string>('BACK_END_URL'),
    ).href;
  }
  getAuthUrl(): string {
    const url = new URL(this.authUrl);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: ['account_email', 'profile_nickname'].join(' '),
    });
    url.search = params.toString();
    return url.toString();
  }
  async validate(code: string): Promise<ISocialUserInfo> {
    const accessToken = await this.getAccessToken(code);
    const { sub, email } = await this.getUserInfo(accessToken);
    return { sub, email };
  }

  async getAccessToken(code: string): Promise<string> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
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

    const sub = data.id.toString();
    const email = data.kakao_account.email;

    return { sub, email };
  }
}
