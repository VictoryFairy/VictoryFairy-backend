import { Module } from '@nestjs/common';
import { UserController } from 'src/controllers/user.controller';
import { UserService } from 'src/services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { UserTerm } from 'src/entities/user-term.entity';
import { Term } from 'src/entities/term.entity';
import { RedisModule } from './redis.module';
import { RankModule } from './rank.module';
import { AwsS3Module } from './aws-s3.module';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team, UserTerm, Term]),
    RedisModule,
    RankModule,
    AwsS3Module,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
