import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rank } from 'src/modules/rank/core/domain/rank.entity';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rank])],
  providers: [RankCoreService, RankingRedisService],
  exports: [RankCoreService, RankingRedisService],
})
export class RankCoreModule {}
