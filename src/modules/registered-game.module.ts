import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisteredGameController } from 'src/controllers/registered-game.controller';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { RegisteredGameService } from 'src/services/registered-game.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegisteredGame])],
  controllers: [RegisteredGameController],
  providers: [RegisteredGameService],
})
export class RegisteredGameModule {}
