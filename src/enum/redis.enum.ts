export enum RedisKeys {
  /** @description [Namespace 없음] */
  USER_INFO = 'userInfo',
  /** @description [Namespace 필수] Email */
  EMAIL_CODE = 'code',
  /** @description [Namespace 필수] 전체 : total, 팀 : teamId */
  RANKING = 'rank',

  /** @description [Namespace 필수] required => 필수 약관 아이디 리스트 | 유저아이디 */
  TERM = 'term',
}
