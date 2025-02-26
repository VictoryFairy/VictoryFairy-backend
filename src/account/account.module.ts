import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/entities/user.entity';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { AccountService } from './account.service';
import { AccessTokenGuard } from 'src/auth/guard/access-token.guard';
import { RefreshTokenGuard } from 'src/auth/guard/refresh-token.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, LocalAuth, SocialAuth]),
    JwtModule.register({}),
  ],
  providers: [AccountService, AccessTokenGuard, RefreshTokenGuard],
  exports: [AccountService, AccessTokenGuard, RefreshTokenGuard],
})
export class AccountModule {}
