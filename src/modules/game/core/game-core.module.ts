import { TypeOrmModule } from '@nestjs/typeorm';
import { GameCoreService } from './game-core.service';
import { Module } from '@nestjs/common';
import { Game } from './domain/game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  providers: [GameCoreService],
  exports: [GameCoreService],
})
export class GameCoreModule {}
