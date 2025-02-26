import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/modules/mail.module';
import { RedisModule } from 'src/modules/redis.module';
import { GoogleOAuthStrategy } from './strategies/google.strategy';
import { SocialProvider } from 'src/const/auth.const';
import { AuthController } from './auth.controller';
import { KakaoOAuthStrategy } from './strategies/kakao.strategy';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports: [AccountModule, JwtModule.register({}), MailModule, RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleOAuthStrategy,
    KakaoOAuthStrategy,
    {
      provide: 'OAUTH_STRATEGIES',
      useFactory: (google: GoogleOAuthStrategy, kakao: KakaoOAuthStrategy) => ({
        [SocialProvider.GOOGLE]: google,
        [SocialProvider.KAKAO]: kakao,
      }),
      inject: [GoogleOAuthStrategy, KakaoOAuthStrategy],
    },
  ],
})
export class AuthModule {}
