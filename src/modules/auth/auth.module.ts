import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/core/mail/mail.module';
import { RedisModule } from 'src/core/redis/redis.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleOAuthStrategy } from './strategies/google.strategy';
import { KakaoOAuthStrategy } from './strategies/kakao.strategy';
import { OAUTH_STRATEGY_MANAGER } from 'src/modules/auth/const/auth.const';
import { OAuthStrategyManager } from './strategies/OAuthStrategyManager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppleOAuthStrategy } from './strategies/apple.strategy';
import { RefreshTokenGuard } from 'src/common/guard/refresh-token.guard';
import { User } from '../user/entities/user.entity';
import { AccessTokenGuard } from 'src/common/guard/access-token.guard';
import { SocialAuthGuard } from 'src/common/guard/social-auth.guard';
import { SocialPostGuard } from 'src/common/guard/social-post.guard';
import { LocalAuth } from './entities/local-auth.entity';
import { SocialAuth } from './entities/social-auth.entity';
import { SOCIAL_AUTH_REPOSITORY } from './repository/social-auth.repository.interface';
import { SocialAuthRepository } from './repository/social-auth.respository';
import { LOCAL_AUTH_REPOSITORY } from './repository/local-auth.repository.interface';
import { LocalAuthRepository } from './repository/local-auth.repository';

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
    SocialPostGuard,
    GoogleOAuthStrategy,
    KakaoOAuthStrategy,
    AppleOAuthStrategy,
    {
      provide: OAUTH_STRATEGY_MANAGER,
      useClass: OAuthStrategyManager,
    },
    {
      provide: SOCIAL_AUTH_REPOSITORY,
      useClass: SocialAuthRepository,
    },
    {
      provide: LOCAL_AUTH_REPOSITORY,
      useClass: LocalAuthRepository,
    },
  ],
  exports: [
    AuthService,
    AccessTokenGuard,
    RefreshTokenGuard,
    OAUTH_STRATEGY_MANAGER,
    JwtStrategy,
    SOCIAL_AUTH_REPOSITORY,
  ],
})
export class AuthModule {}
