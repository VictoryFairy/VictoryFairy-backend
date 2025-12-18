import { Global, Module } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/infra/mail/mail.module';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';
import { GoogleOAuthStrategy } from 'src/modules/auth/strategies/google.strategy';
import { KakaoOAuthStrategy } from 'src/modules/auth/strategies/kakao.strategy';
import { OAUTH_STRATEGY_MANAGER } from 'src/modules/auth/const/auth.const';
import { OAuthStrategyManager } from 'src/modules/auth/strategies/OAuthStrategyManager';
import { AppleOAuthStrategy } from 'src/modules/auth/strategies/apple.strategy';
import { AccountCoreModule } from 'src/modules/account/core/account-core.module';
import { AuthRedisService } from './auth-redis.service';

@Global()
@Module({
  imports: [JwtModule.register({}), MailModule, AccountCoreModule],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleOAuthStrategy,
    KakaoOAuthStrategy,
    AppleOAuthStrategy,
    {
      provide: OAUTH_STRATEGY_MANAGER,
      useClass: OAuthStrategyManager,
    },
    AuthRedisService,
  ],
  exports: [AuthService, OAUTH_STRATEGY_MANAGER, JwtStrategy, AuthRedisService],
})
export class AuthModule {}
