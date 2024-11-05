import { Module } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { RankController } from '../controllers/rank.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rank, RegisteredGame]),
    AuthModule,
    RedisModule,
  ],
  exports: [RankService],
  controllers: [RankController],
  providers: [RankService],
})
export class RankModule {}
