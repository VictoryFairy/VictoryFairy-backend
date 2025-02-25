import { SocialProvider } from 'src/const/auth.const';
import { OAuthStrategy } from './base-oauth.strategy';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IGoogleOAuthUserInfo, ISocialUserInfo } from 'src/types/auth.type';

@Injectable()
export class GoogleOAuthStrategy implements OAuthStrategy {
  provider: SocialProvider = SocialProvider.GOOGLE;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private tokenUrl = 'https://oauth2.googleapis.com/token';
  private userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
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
      scope: ['email', 'profile'].join(' '),
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

    const data: IGoogleOAuthUserInfo = await response.json();

    return { sub: data.id, email: data.email };
  }
}
