import { BaseDomainError } from 'src/common/error/base-domain.error';

export const ACCOUNT_ERROR_CODE = {
  // User 관련
  USER_NOT_FOUND: 'ACCOUNT_USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'ACCOUNT_EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'ACCOUNT_INVALID_CREDENTIALS',
  NICKNAME_ALREADY_EXISTS: 'ACCOUNT_NICKNAME_ALREADY_EXISTS',
  NICKNAME_GENERATION_FAILED: 'ACCOUNT_NICKNAME_GENERATION_FAILED',
  NOT_LOCAL_ACCOUNT: 'ACCOUNT_NOT_LOCAL_ACCOUNT',
  INVALID_TEAM_ID: 'ACCOUNT_INVALID_TEAM_ID',
  EMPTY_NICKNAME: 'ACCOUNT_EMPTY_NICKNAME',
  EMPTY_PROFILE_IMAGE: 'ACCOUNT_EMPTY_PROFILE_IMAGE',
  ALREADY_REGISTERED: 'ACCOUNT_ALREADY_REGISTERED',
  // Social 관련
  ALREADY_LINKED: 'ACCOUNT_ALREADY_LINKED',
  NO_SOCIAL_LINK_HISTORY: 'ACCOUNT_NO_SOCIAL_LINK_HISTORY',
  NOT_FOUND_SOCIAL_PLATFORM: 'ACCOUNT_NOT_FOUND_SOCIAL_PLATFORM',
  PRIMARY_SOCIAL_CANNOT_UNLINK: 'ACCOUNT_PRIMARY_SOCIAL_CANNOT_UNLINK',
  INVALID_SOCIAL_AUTH_DATA: 'ACCOUNT_INVALID_SOCIAL_AUTH_DATA',
  INVALID_PROVIDER: 'ACCOUNT_INVALID_PROVIDER',
  // Term 관련
  EMPTY_TERM_ID: 'ACCOUNT_EMPTY_TERM_ID',
} as const;

export type AccountErrorCode =
  (typeof ACCOUNT_ERROR_CODE)[keyof typeof ACCOUNT_ERROR_CODE];

abstract class AccountDomainError extends BaseDomainError {
  constructor(message: string, code: AccountErrorCode) {
    super(message, code);
  }
}

export class AccountUserNotFoundError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '존재하지 않는 유저입니다',
      ACCOUNT_ERROR_CODE.USER_NOT_FOUND,
    );
  }
}

export class AccountEmailAlreadyExistsError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '이미 가입된 이메일입니다',
      ACCOUNT_ERROR_CODE.EMAIL_ALREADY_EXISTS,
    );
  }
}

export class AccountInvalidCredentialsError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '이메일 또는 비밀번호가 틀렸습니다',
      ACCOUNT_ERROR_CODE.INVALID_CREDENTIALS,
    );
  }
}

export class AccountNicknameAlreadyExistsError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '이미 존재하는 닉네임입니다',
      ACCOUNT_ERROR_CODE.NICKNAME_ALREADY_EXISTS,
    );
  }
}

export class AccountNicknameGenerationFailedError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '닉네임 생성 실패',
      ACCOUNT_ERROR_CODE.NICKNAME_GENERATION_FAILED,
    );
  }
}

export class AccountNotLocalAccountError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '로컬 계정이 아닙니다',
      ACCOUNT_ERROR_CODE.NOT_LOCAL_ACCOUNT,
    );
  }
}

export class AccountInvalidTeamIdError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '유효하지 않은 팀 ID입니다',
      ACCOUNT_ERROR_CODE.INVALID_TEAM_ID,
    );
  }
}

export class AccountEmptyNicknameError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '닉네임이 비어있습니다',
      ACCOUNT_ERROR_CODE.EMPTY_NICKNAME,
    );
  }
}

export class AccountEmptyProfileImageError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '업데이트할 프로필 이미지가 비어있습니다',
      ACCOUNT_ERROR_CODE.EMPTY_PROFILE_IMAGE,
    );
  }
}

export class AccountAlreadyRegisteredError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '해당 아이디는 이미 가입되어 있습니다',
      ACCOUNT_ERROR_CODE.ALREADY_REGISTERED,
    );
  }
}

export class AccountAlreadyLinkedError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '이미 연동된 계정입니다',
      ACCOUNT_ERROR_CODE.ALREADY_LINKED,
    );
  }
}

export class AccountNoSocialLinkHistoryError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '소셜 계정 연동 내역이 없습니다',
      ACCOUNT_ERROR_CODE.NO_SOCIAL_LINK_HISTORY,
    );
  }
}

export class AccountSocialPlatformNotFoundError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '해당 플랫폼으로 연동된 계정이 없습니다',
      ACCOUNT_ERROR_CODE.NOT_FOUND_SOCIAL_PLATFORM,
    );
  }
}

export class AccountPrimarySocialCannotUnlinkError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '첫 가입 플랫폼은 연동 해제 불가능합니다',
      ACCOUNT_ERROR_CODE.PRIMARY_SOCIAL_CANNOT_UNLINK,
    );
  }
}

export class AccountInvalidSocialAuthDataError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || 'SocialAuth create error',
      ACCOUNT_ERROR_CODE.INVALID_SOCIAL_AUTH_DATA,
    );
  }
}

export class AccountInvalidProviderError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '소셜 로그인 제공하는 플랫폼이 아닙니다',
      ACCOUNT_ERROR_CODE.INVALID_PROVIDER,
    );
  }
}

export class AccountEmptyTermIdError extends AccountDomainError {
  constructor(message?: string) {
    super(
      message || '약관 아이디가 없습니다',
      ACCOUNT_ERROR_CODE.EMPTY_TERM_ID,
    );
  }
}
