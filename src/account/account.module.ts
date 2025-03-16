import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccountService } from './account.service';
import { RedisModule } from 'src/modules/redis.module';
import { TermModule } from 'src/modules/term.module';
import { AuthController } from 'src/auth/auth.controller';
import { UserController } from 'src/controllers/user.controller';
import { RankModule } from 'src/modules/rank.module';
import { UserModule } from 'src/modules/user.module';
@Module({
  imports: [
    JwtModule.register({}),
    RedisModule,
    TermModule,
    RankModule,
    UserModule,
    RankModule,
  ],
  controllers: [AuthController, UserController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
