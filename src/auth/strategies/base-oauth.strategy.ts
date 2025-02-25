import { SocialProvider } from 'src/const/auth.const';
import { ISocialUserInfo } from 'src/types/auth.type';

export interface OAuthStrategy {
  provider: SocialProvider;
  getAuthUrl(): string;
  getAccessToken(code: string): Promise<string>;
  getUserInfo(accessToken: string): Promise<ISocialUserInfo>;
  validate(code: string): Promise<ISocialUserInfo>;
}
