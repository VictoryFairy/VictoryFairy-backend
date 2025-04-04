import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from 'src/modules/team/entities/team.entity';
import { RedisModule } from '../../core/redis/redis.module';
import { AwsS3Module } from '../../core/aws-s3/aws-s3.module';
import { TermModule } from '../term/term.module';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team]),
    RedisModule,
    AwsS3Module,
    TermModule,
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
