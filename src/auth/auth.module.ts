import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/modules/mail.module';
import { RedisModule } from 'src/modules/redis.module';
import { GoogleOAuthStrategy } from './strategies/google.strategy';
import { SocialProvider } from 'src/const/auth.const';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { KakaoOAuthStrategy } from './strategies/kakao.strategy';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, SocialAuth]),
    MailModule,
    RedisModule,
  ],
  controllers: [AuthController],
  exports: [AuthService],
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
