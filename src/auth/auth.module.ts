import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/modules/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { RedisModule } from 'src/modules/redis.module';

@Module({
  imports: [
    JwtModule.register({}),
    MailModule,
    TypeOrmModule.forFeature([User]),
    RedisModule,
  ],
  exports: [AuthService],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
