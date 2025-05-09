import { SocialProvider, TFlowType } from '../../const/auth.const';

export interface IOAuthStrategy {
  provider: SocialProvider;
  getCodeAuthUrl(flowType: TFlowType, state: string): string;
  validateAndGetUserInfo(
    code: string,
    flowType: TFlowType,
  ): Promise<ISocialUserInfo>;
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

export interface IAppleTokenResponse {
  access_token: string;
  token_type: 'Bearer' | 'bearer';
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

export interface IAppleDecodedPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  nonce?: string;
  at_hash?: string;
  email: string;
  email_verified: string;
  is_private_email: string;
  auth_time: number;
  nonce_supported: boolean;
}
