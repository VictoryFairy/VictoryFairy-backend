import { BaseDomainError } from 'src/common/error/base-domain.error';

export const REGISTERED_GAME_ERROR_CODE = {
  USER_REQUIRED: 'USER_REQUIRED',
  GAME_REQUIRED: 'GAME_REQUIRED',
  CHEERING_TEAM_REQUIRED: 'CHEERING_TEAM_REQUIRED',
  SEAT_REQUIRED: 'SEAT_REQUIRED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  INVALID_CHEERING_TEAM: 'INVALID_CHEERING_TEAM',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  NOT_FOUND: 'REGISTERED_GAME_NOT_FOUND',
} as const;

export type RegisteredGameErrorCode =
  (typeof REGISTERED_GAME_ERROR_CODE)[keyof typeof REGISTERED_GAME_ERROR_CODE];

abstract class RegisteredGameDomainError extends BaseDomainError {
  constructor(message: string, code: RegisteredGameErrorCode) {
    super(message, code);
  }
}

export class RegisteredGameUserRequiredError extends RegisteredGameDomainError {
  constructor() {
    super('유저 정보가 필요합니다', REGISTERED_GAME_ERROR_CODE.USER_REQUIRED);
  }
}

export class RegisteredGameGameRequiredError extends RegisteredGameDomainError {
  constructor() {
    super('경기 정보가 필요합니다', REGISTERED_GAME_ERROR_CODE.GAME_REQUIRED);
  }
}

export class RegisteredGameCheeringTeamRequiredError extends RegisteredGameDomainError {
  constructor() {
    super(
      '응원팀 정보가 필요합니다',
      REGISTERED_GAME_ERROR_CODE.CHEERING_TEAM_REQUIRED,
    );
  }
}

export class RegisteredGameSeatRequiredError extends RegisteredGameDomainError {
  constructor() {
    super('좌석 정보가 필요합니다', REGISTERED_GAME_ERROR_CODE.SEAT_REQUIRED);
  }
}

export class RegisteredGameReviewRequiredError extends RegisteredGameDomainError {
  constructor() {
    super('리뷰 정보가 필요합니다', REGISTERED_GAME_ERROR_CODE.REVIEW_REQUIRED);
  }
}

export class RegisteredGameInvalidCheeringTeamError extends RegisteredGameDomainError {
  constructor() {
    super(
      '응원팀은 해당 경기의 홈팀 또는 원정팀이어야 합니다',
      REGISTERED_GAME_ERROR_CODE.INVALID_CHEERING_TEAM,
    );
  }
}

export class RegisteredGameAlreadyRegisteredError extends RegisteredGameDomainError {
  constructor() {
    super(
      '이미 등록된 경기입니다',
      REGISTERED_GAME_ERROR_CODE.ALREADY_REGISTERED,
    );
  }
}

export class RegisteredGameNotFoundError extends RegisteredGameDomainError {
  constructor() {
    super('직관 경기를 찾을 수 없습니다', REGISTERED_GAME_ERROR_CODE.NOT_FOUND);
  }
}
