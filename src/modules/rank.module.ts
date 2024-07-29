import { Module } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { RankController } from '../controllers/rank.controller';

@Module({
  controllers: [RankController],
  providers: [RankService],
})
export class RankModule {}
