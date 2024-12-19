export const RedisKeys = {
  /** @description [Namespace 없음] */
  USER_INFO: 'userInfo',
  /** @description [Namespace 필수] Email */
  EMAIL_CODE: 'code',
  /** @description [Namespace 필수] 전체 : total, 팀 : teamId */
  RANKING: 'rank',
} as const;

export type RedisKeys = (typeof RedisKeys)[keyof typeof RedisKeys];
