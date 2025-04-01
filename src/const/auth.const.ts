/** 인증 코드 자릿수 */
export const CODE_LENGTH = 5;

/** 인증 코드 캐싱 제한 시간 (단위 초) */
export const CODE_LIMIT_TIME = 180;

/** 소셜로그인 제공자 */
export const SocialProvider = {
  GOOGLE: 'google',
  APPLE: 'apple',
  KAKAO: 'kakao',
} as const;

/** 소셜로그인 제공자 타입*/
export type SocialProvider =
  (typeof SocialProvider)[keyof typeof SocialProvider];

export const TFlowType = {
  LOGIN: 'login',
  LINK: 'link',
} as const;

export type TFlowType = (typeof TFlowType)[keyof typeof TFlowType];

export const OAuthStatus = {
  SUCCESS: 'success',
  FAIL: 'fail',
} as const;

export type OAuthStatus = (typeof OAuthStatus)[keyof typeof OAuthStatus];

export const OAUTH_STRATEGY_MANAGER = Symbol('OAUTH_STRATEGY_MANAGER');
