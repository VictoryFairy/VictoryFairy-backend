import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/entities/user.entity';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { AccountService } from './account.service';
import { AccessTokenGuard } from 'src/auth/guard/access-token.guard';
import { RefreshTokenGuard } from 'src/auth/guard/refresh-token.guard';
import { RedisModule } from 'src/modules/redis.module';
import { SocialAuthGuard } from 'src/auth/guard/social-auth.guard';
import { GoogleOAuthStrategy } from 'src/auth/strategies/google.strategy';
import { KakaoOAuthStrategy } from 'src/auth/strategies/kakao.strategy';
import { OAuthStrategyManager } from 'src/auth/strategies/OAuthStrategyManager';
import { OAUTH_STRATEGY_MANAGER } from 'src/const/auth.const';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, LocalAuth, SocialAuth]),
    JwtModule.register({}),
    RedisModule,
  ],
  providers: [
    AccountService,
    AccessTokenGuard,
    RefreshTokenGuard,
    SocialAuthGuard,
    GoogleOAuthStrategy,
    KakaoOAuthStrategy,
    {
      provide: OAUTH_STRATEGY_MANAGER,
      useClass: OAuthStrategyManager,
    },
  ],
  exports: [
    AccountService,
    AccessTokenGuard,
    RefreshTokenGuard,
    SocialAuthGuard,
    OAUTH_STRATEGY_MANAGER,
  ],
})
export class AccountModule {}
