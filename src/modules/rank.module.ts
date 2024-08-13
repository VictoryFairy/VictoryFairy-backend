import { Module } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { RankController } from '../controllers/rank.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rank, RegisteredGame])],
  controllers: [RankController],
  providers: [RankService],
})
export class RankModule {}
