import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from 'src/modules/team/entities/team.entity';
import { RedisModule } from '../../core/redis/redis.module';
import { AwsS3Module } from '../../core/aws-s3/aws-s3.module';
import { TermModule } from '../term/term.module';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';
import { USER_REPOSITORY } from './repository/user.repository.interface';
import { UserRepository } from './repository/user.repository';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team]),
    RedisModule,
    AwsS3Module,
    TermModule,
    forwardRef(() => AuthModule),
    TeamModule,
  ],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: UserRepository },
  ],
  exports: [UserService],
})
export class UserModule {}
