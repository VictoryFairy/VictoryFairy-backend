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
 * jwt 가드가 먼저 사용되고 이후 다른 가드 사용하기 위해 , 다른 가드들은 파라미터로 받음
 */
export const JwtAuth = (type: TType, ...additionalGuards: any[]) => {
  const isAccess = type === 'access';
  return applyDecorators(
    UseGuards(
      isAccess ? AccessTokenGuard : RefreshTokenGuard,
      ...additionalGuards,
    ),
    isAccess ? ApiBearerAuth() : ApiCookieAuth('token'),
    ApiUnauthorizedResponse({ description: '유효한 토큰이 아닌 경우' }),
  );
};
