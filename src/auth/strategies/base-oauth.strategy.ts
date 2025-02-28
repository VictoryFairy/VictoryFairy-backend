import { SocialProvider } from 'src/const/auth.const';
import { ISocialUserInfo } from 'src/types/auth.type';
import { ConfigService } from '@nestjs/config';

export interface IOAuthStrategy {
  provider: SocialProvider;
  getCodeAuthUrl(flowType: 'login' | 'link', state: string): string;
  validateAndGetUserInfo(
    code: string,
    flowType: 'login' | 'link',
  ): Promise<ISocialUserInfo>;
}

export abstract class BaseOAuthStrategy implements IOAuthStrategy {
  protected clientId: string;
  protected clientSecret: string;

  constructor(
    public readonly provider: SocialProvider,
    protected configService: ConfigService,
    protected authUrl: string,
    protected tokenUrl: string,
    protected userInfoUrl: string,
    public readonly scope: string[],
  ) {
    this.clientId = this.configService.get<string>(
      `${provider.toUpperCase()}_CLIENT_ID`,
    );
    this.clientSecret = this.configService.get<string>(
      `${provider.toUpperCase()}_CLIENT_SECRET`,
    );
    this.scope = scope;
  }

  getCodeAuthUrl(flowType: 'login' | 'link', state: string): string {
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

  getCallbackUri(flowType: 'login' | 'link'): string {
    return new URL(
      `auth/${flowType}/${this.provider}/callback`,
      this.configService.get<string>('BACK_END_URL'),
    ).href;
  }

  async validateAndGetUserInfo(
    code: string,
    flowType: 'login' | 'link',
  ): Promise<ISocialUserInfo> {
    const callbackUri = this.getCallbackUri(flowType);
    const accessToken = await this.getAccessToken(code, callbackUri);
    return await this.getUserInfo(accessToken);
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

  abstract getUserInfo(accessToken: string): Promise<ISocialUserInfo>;
}
