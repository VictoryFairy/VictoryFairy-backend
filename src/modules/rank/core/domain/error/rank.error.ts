import { BaseDomainError } from 'src/common/error/base-domain.error';

export const RANK_ERROR_CODE = {
  RECORD_NOT_FOUND: 'RANK_RECORD_NOT_FOUND',
  INVALID_RECORD_DECREASE: 'RANK_INVALID_RECORD_DECREASE',
  INVALID_TEAM_ID: 'RANK_INVALID_TEAM_ID',
  INVALID_USER_ID: 'RANK_INVALID_USER_ID',
  INVALID_ACTIVE_YEAR: 'RANK_INVALID_ACTIVE_YEAR',
} as const;

export type RankErrorCode =
  (typeof RANK_ERROR_CODE)[keyof typeof RANK_ERROR_CODE];

abstract class RankDomainError extends BaseDomainError {
  constructor(message: string, code: RankErrorCode) {
    super(message, code);
  }
}

export class RankRecordNotFoundError extends RankDomainError {
  constructor(message?: string) {
    super(
      message || '제거하려는 랭킹 기록이 존재하지 않습니다',
      RANK_ERROR_CODE.RECORD_NOT_FOUND,
    );
  }
}

export class RankInvalidRecordDecreaseError extends RankDomainError {
  constructor(message?: string) {
    super(
      message || '유효하지 않은 요청입니다',
      RANK_ERROR_CODE.INVALID_RECORD_DECREASE,
    );
  }
}

export class RankInvalidTeamIdError extends RankDomainError {
  constructor(message?: string) {
    super(
      message || '유효하지 않은 팀 ID입니다',
      RANK_ERROR_CODE.INVALID_TEAM_ID,
    );
  }
}

export class RankInvalidUserIdError extends RankDomainError {
  constructor(message?: string) {
    super(
      message || '유효하지 않은 유저 ID입니다',
      RANK_ERROR_CODE.INVALID_USER_ID,
    );
  }
}

export class RankInvalidActiveYearError extends RankDomainError {
  constructor(message?: string) {
    super(
      message || '유효하지 않은 활성 연도입니다',
      RANK_ERROR_CODE.INVALID_ACTIVE_YEAR,
    );
  }
}
