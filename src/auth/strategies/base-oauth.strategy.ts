import { SocialProvider } from 'src/const/auth.const';
import { ISocialUserInfo } from 'src/types/auth.type';
import { ConfigService } from '@nestjs/config';

export interface IOAuthStrategy {
  provider: SocialProvider;
  getAuthUrl(): string;
  getAccessToken(code: string): Promise<string>;
  getUserInfo(accessToken: string): Promise<ISocialUserInfo>;
  validate(code: string): Promise<ISocialUserInfo>;
}

export abstract class BaseOAuthStrategy implements IOAuthStrategy {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;

  constructor(
    public readonly provider: SocialProvider,
    protected configService: ConfigService,
    protected authUrl: string,
    protected tokenUrl: string,
    protected userInfoUrl: string,
    protected clientIdKey: string,
    protected clientSecretKey: string,
  ) {
    this.clientId = this.configService.get<string>(clientIdKey, '');
    this.clientSecret = this.configService.get<string>(clientSecretKey, '');
    this.redirectUri = new URL(
      `auth/${this.provider}/callback`,
      this.configService.get<string>('BACK_END_URL'),
    ).href;
  }

  protected abstract getScope(): string[];

  getAuthUrl(): string {
    const url = new URL(this.authUrl);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.getScope().join(' '),
    });
    url.search = params.toString();
    return url.toString();
  }

  async validate(code: string): Promise<ISocialUserInfo> {
    const accessToken = await this.getAccessToken(code);
    return await this.getUserInfo(accessToken);
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

  abstract getUserInfo(accessToken: string): Promise<ISocialUserInfo>;
}
