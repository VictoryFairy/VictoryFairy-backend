import { Module } from '@nestjs/common';
import { GameService } from 'src/services/game.service';
import { GameController } from 'src/controllers/game.controller';

@Module({
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
