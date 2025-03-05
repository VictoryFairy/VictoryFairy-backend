import { Module } from '@nestjs/common';
import { UserService } from 'src/services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { RedisModule } from './redis.module';
import { AwsS3Module } from './aws-s3.module';
import { User } from 'src/entities/user.entity';
import { TermModule } from './term.module';

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
