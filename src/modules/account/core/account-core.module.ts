import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { AccountCoreService } from './account-core.service';
import { UserRedisService } from './user-redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AccountCoreService, UserRedisService],
  exports: [AccountCoreService, UserRedisService],
})
export class AccountCoreModule {}
