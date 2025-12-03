import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/core/mail/mail.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleOAuthStrategy } from './strategies/google.strategy';
import { KakaoOAuthStrategy } from './strategies/kakao.strategy';
import { OAUTH_STRATEGY_MANAGER } from 'src/modules/auth/const/auth.const';
import { OAuthStrategyManager } from './strategies/OAuthStrategyManager';
import { AppleOAuthStrategy } from './strategies/apple.strategy';
import { AccountCoreModule } from '../account/core/account-core.module';

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
  ],
  exports: [AuthService, OAUTH_STRATEGY_MANAGER, JwtStrategy],
})
export class AuthModule {}
