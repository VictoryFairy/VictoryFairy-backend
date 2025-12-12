import { HttpStatus } from '@nestjs/common';
import {
  REGISTERED_GAME_ERROR_CODE,
  RegisteredGameErrorCode,
} from 'src/modules/registered-game/core/domain/error/registered-game.error';

export const DOMAIN_ERROR_HTTP_MAP: Record<
  RegisteredGameErrorCode,
  HttpStatus
> = {
  // RegisteredGameError
  [REGISTERED_GAME_ERROR_CODE.USER_REQUIRED]: HttpStatus.BAD_REQUEST,
  [REGISTERED_GAME_ERROR_CODE.GAME_REQUIRED]: HttpStatus.BAD_REQUEST,
  [REGISTERED_GAME_ERROR_CODE.CHEERING_TEAM_REQUIRED]: HttpStatus.BAD_REQUEST,
  [REGISTERED_GAME_ERROR_CODE.SEAT_REQUIRED]: HttpStatus.BAD_REQUEST,
  [REGISTERED_GAME_ERROR_CODE.REVIEW_REQUIRED]: HttpStatus.BAD_REQUEST,
  [REGISTERED_GAME_ERROR_CODE.INVALID_CHEERING_TEAM]: HttpStatus.BAD_REQUEST,
  [REGISTERED_GAME_ERROR_CODE.ALREADY_REGISTERED]: HttpStatus.CONFLICT,
  [REGISTERED_GAME_ERROR_CODE.NOT_FOUND]: HttpStatus.NOT_FOUND,
  // 다른 도메인
};
