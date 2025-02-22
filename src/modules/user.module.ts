import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UserController } from 'src/controllers/user.controller';
import { UserService } from 'src/services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { RedisModule } from './redis.module';
import { RankModule } from './rank.module';
import { AwsS3Module } from './aws-s3.module';
import { Team } from 'src/entities/team.entity';
import { UserTerm } from 'src/entities/user-term.entity';
import { Term } from 'src/entities/term.entity';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      User,
      Team,
      UserTerm,
      Term,
      LocalAuth,
      SocialAuth,
    ]),
    RedisModule,
    RankModule,
    AwsS3Module,
    RedisModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
