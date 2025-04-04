import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from 'src/core/redis/redis.module';
import { TermModule } from 'src/modules/term/term.module';
import { UserController } from 'src/modules/user/user.controller';
import { UserModule } from 'src/modules/user/user.module';
import { AccountService } from './account.service';
import { RankModule } from '../rank/rank.module';
import { AuthController } from '../auth/auth.controller';
@Module({
  imports: [
    JwtModule.register({}),
    RedisModule,
    TermModule,
    RankModule,
    UserModule,
  ],
  controllers: [AuthController, UserController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
