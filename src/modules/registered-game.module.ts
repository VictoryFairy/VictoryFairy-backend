import { Module } from '@nestjs/common';
import { RegisteredGameController } from 'src/controllers/registered-game.controller';
import { RegisteredGameService } from 'src/services/registered-game.service';

@Module({
  controllers: [RegisteredGameController],
  providers: [RegisteredGameService],
})
export class RegisteredGameModule {}
