import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rank } from '../core/domain/rank.entity';
import { RankCoreService } from './rank-core.service';
import { RankingRedisService } from 'src/core/redis/ranking-redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rank])],
  providers: [RankCoreService, RankingRedisService],
  exports: [RankCoreService, RankingRedisService],
})
export class RankCoreModule {}
