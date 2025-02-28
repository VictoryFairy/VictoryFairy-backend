import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/modules/mail.module';
import { RedisModule } from 'src/modules/redis.module';
import { AuthController } from './auth.controller';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports: [AccountModule, JwtModule.register({}), MailModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
