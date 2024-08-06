import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guard/access-token.guard';
import { RefreshTokenGuard } from 'src/auth/guard/refresh-token.guard';

type TType = 'access' | 'refresh';

/**
 * @description jwt auth 가드와 swagger 문서 관련 데코레이터 하나로 만든 Custom Decorator
 */
export const JwtAuth = (type: TType) => {
  const isAccess = type === 'access';
  return applyDecorators(
    isAccess ? UseGuards(AccessTokenGuard) : UseGuards(RefreshTokenGuard),
    isAccess ? ApiBearerAuth() : ApiCookieAuth('token'),
    ApiUnauthorizedResponse({ description: '유효한 토큰이 아닌 경우' }),
  );
};
