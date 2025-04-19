import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from 'src/core/redis/redis.module';
import { TermModule } from 'src/modules/term/term.module';
import { UserController } from 'src/modules/user/user.controller';
import { UserModule } from 'src/modules/user/user.module';
import { AccountService } from './account.service';
import { RankModule } from '../rank/rank.module';
import { AuthController } from '../auth/auth.controller';
import { AwsS3Module } from 'src/core/aws-s3/aws-s3.module';
@Module({
  imports: [
    JwtModule.register({}),
    RedisModule,
    TermModule,
    RankModule,
    UserModule,
    AwsS3Module,
  ],
  controllers: [AuthController, UserController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
