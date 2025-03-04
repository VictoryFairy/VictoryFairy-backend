export const RedisKeys = {
  /** @description [Namespace 없음] */
  USER_INFO: 'userInfo',
  /** @description [Namespace 필수] Email */
  EMAIL_CODE: 'code',
  /** @description [Namespace 필수] 전체 : total, 팀 : teamId */
  RANKING: 'rank',
  /** @description [Namespace 필수] uuid - 임시 코드 캐싱용*/
  OAUTH_STATE: 'oauthState',
  /** @description [Namespace 없음] 필수 선택 전체 약관 리스트 캐싱용*/
  Term: 'term',
  /** @description [Namespace 필수] 유저 약관 정보 캐싱용*/
  UserTerm: 'userTerm',
} as const;

export type RedisKeys = (typeof RedisKeys)[keyof typeof RedisKeys];
