import { BaseDomainError } from 'src/common/error/base-domain.error';

export const GAME_ERROR_CODE = {
  NOT_FOUND: 'GAME_NOT_FOUND',
  SAME_HOME_AWAY_TEAM: 'GAME_SAME_HOME_AWAY_TEAM',
  INVALID_PRE_GAME_WINNER: 'GAME_INVALID_PRE_GAME_WINNER',
  INVALID_FINISHED_GAME_NO_WINNER: 'GAME_INVALID_FINISHED_GAME_NO_WINNER',
  INVALID_FINISHED_GAME_HAS_WINNER: 'GAME_INVALID_FINISHED_GAME_HAS_WINNER',
} as const;

export type GameErrorCode =
  (typeof GAME_ERROR_CODE)[keyof typeof GAME_ERROR_CODE];

abstract class GameDomainError extends BaseDomainError {
  constructor(message: string, code: GameErrorCode) {
    super(message, code);
  }
}

export class GameNotFoundError extends GameDomainError {
  constructor(message?: string) {
    super(message || '해당 경기를 찾을 수 없습니다', GAME_ERROR_CODE.NOT_FOUND);
  }
}

export class GameSameHomeAwayTeamError extends GameDomainError {
  constructor(message?: string) {
    super(
      message || '홈 팀과 원정 팀은 같을 수 없습니다',
      GAME_ERROR_CODE.SAME_HOME_AWAY_TEAM,
    );
  }
}

export class GameInvalidPreGameWinnerError extends GameDomainError {
  constructor(message?: string) {
    super(
      message || '경기 전 상태에서는 승리 팀이 반드시 없어야 합니다',
      GAME_ERROR_CODE.INVALID_PRE_GAME_WINNER,
    );
  }
}

export class GameInvalidFinishedGameNoWinnerError extends GameDomainError {
  constructor(message?: string) {
    super(
      message ||
        '경기 종료 상태이고 동점이 아니면 승리 팀이 반드시 존재해야 합니다',
      GAME_ERROR_CODE.INVALID_FINISHED_GAME_NO_WINNER,
    );
  }
}

export class GameInvalidFinishedGameHasWinnerError extends GameDomainError {
  constructor(message?: string) {
    super(
      message || '경기 종료 상태이고 동점이면 승리 팀이 반드시 없어야 합니다',
      GAME_ERROR_CODE.INVALID_FINISHED_GAME_HAS_WINNER,
    );
  }
}
