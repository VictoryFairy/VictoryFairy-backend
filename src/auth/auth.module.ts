import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/modules/mail.module';
import { RedisModule } from 'src/modules/redis.module';
import { AccessTokenGuard } from './guard/access-token.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { SocialAuthGuard } from './guard/social-auth.guard';
import { GoogleOAuthStrategy } from './strategies/google.strategy';
import { KakaoOAuthStrategy } from './strategies/kakao.strategy';
import { OAUTH_STRATEGY_MANAGER } from 'src/const/auth.const';
import { OAuthStrategyManager } from './strategies/OAuthStrategyManager';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppleOAuthStrategy } from './strategies/apple.strategy';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, LocalAuth, SocialAuth]),
    JwtModule.register({}),
    MailModule,
    RedisModule,
  ],
  providers: [
    AuthService,
    RefreshTokenGuard,
    AccessTokenGuard,
    JwtStrategy,
    SocialAuthGuard,
    GoogleOAuthStrategy,
    KakaoOAuthStrategy,
    AppleOAuthStrategy,
    {
      provide: OAUTH_STRATEGY_MANAGER,
      useClass: OAuthStrategyManager,
    },
  ],
  exports: [
    AuthService,
    AccessTokenGuard,
    RefreshTokenGuard,
    OAUTH_STRATEGY_MANAGER,
    JwtStrategy,
  ],
})
export class AuthModule {}
