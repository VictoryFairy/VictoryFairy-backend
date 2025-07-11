import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/core/redis/redis.module';
import { Rank } from 'src/modules/rank/entities/rank.entity';
import { RegisteredGame } from 'src/modules/registered-game/entities/registered-game.entity';
import { RankService } from './rank.service';
import { RankController } from './rank.controller';
import { RankRepository } from './repository/rank.repository';
import { RANK_REPOSITORY } from './repository/rank.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Rank, RegisteredGame]), RedisModule],
  exports: [RankService],
  controllers: [RankController],
  providers: [
    RankService,
    { provide: RANK_REPOSITORY, useClass: RankRepository },
  ],
})
export class RankModule {}
