import { Module } from '@nestjs/common';
import { RegisteredGameCoreModule } from '../core/registered-game-core.module';
import { RegisteredGameApplicationCommandService } from './registered-game-application.command.service';
import { RegisteredGameController } from '../registered-game.controller';
import { GameCoreModule } from 'src/modules/game/core/game-core.module';
import { RegisteredGameApplicationQueryService } from './registered-game-application.query.service';

@Module({
  imports: [RegisteredGameCoreModule, GameCoreModule],
  providers: [
    RegisteredGameApplicationCommandService,
    RegisteredGameApplicationQueryService,
  ],
  controllers: [RegisteredGameController],
})
export class RegisteredGameApplicationModule {}
