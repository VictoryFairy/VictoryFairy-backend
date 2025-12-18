import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { User } from '../domain/user.entity';
import { Team } from 'src/modules/team/core/domain/team.entity';
import { LocalAuth } from '../domain/local-auth.entity';
import { SocialAuth } from '../domain/social-auth.entity';

/** User 엔티티 + support_team 릴레이션이 로드된 상태 */
export interface UserWithTeam extends User {
  support_team: Team;
}

/** User 엔티티 + local_auth 릴레이션이 로드된 상태 */
export interface UserWithLocalAuth extends User {
  local_auth: LocalAuth;
}

/** User 엔티티 + social_auths 릴레이션이 로드된 상태 */
export interface UserWithSocialAuths extends User {
  social_auths: SocialAuth[];
}

/** User 엔티티 + support_team + local_auth 릴레이션이 로드된 상태 */
export interface UserWithTeamAndLocalAuth extends User {
  support_team: Team;
  local_auth: LocalAuth | null;
}

/** User 엔티티 + support_team + social_auths 릴레이션이 로드된 상태 */
export interface UserWithTeamAndSocialAuths extends User {
  support_team: Team;
  social_auths: SocialAuth[];
}

/** 소셜 계정 연동 입력 데이터 */
export interface CreateSocialAuthInput {
  sub: string;
  provider: SocialProvider;
  userId: number;
  providerEmail: string;
  isPrimary: boolean;
}

/** 로컬 유저 생성 입력 데이터 */
export interface CreateLocalUserInput {
  email: string;
  password: string;
  image: string;
  teamId: number;
  nickname: string;
}

/** 로컬 유저 로그인 입력 데이터 */
export interface ValidateLocalUserInput {
  email: string;
  password: string;
}
