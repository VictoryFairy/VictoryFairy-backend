import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { AccountCoreService } from './account-core.service';
import { UserRedisService } from './user-redis.service';
import { SocialAuth } from './domain/social-auth.entity';
import { LocalAuth } from './domain/local-auth.entity';
import { UserTerm } from './domain/user-term.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, LocalAuth, SocialAuth, UserTerm])],
  providers: [AccountCoreService, UserRedisService],
  exports: [AccountCoreService, UserRedisService],
})
export class AccountCoreModule {}
