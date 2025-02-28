import { SocialProvider } from 'src/const/auth.const';

export interface IJwtPayload {
  id: number;
  email: string;
  type: 'ac' | 'rf';
}

export interface IOAuthStateCachingData {
  provider: SocialProvider;
  state: string;
  userId?: number;
}

export interface ISocialUserInfo {
  sub: string;
  email: string;
}

export interface IGoogleOAuthUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface IKakaoOAuthUserInfo {
  id: number;
  connected_at: Date;
  properties: { nickname: string };
  kakao_account: {
    profile_nickname_needs_agreement: boolean;
    profile: { nickname: string; is_default_nickname: boolean };
    has_email: boolean;
    email_needs_agreement: boolean;
    is_email_valid: boolean;
    is_email_verified: boolean;
    email: string;
  };
}
