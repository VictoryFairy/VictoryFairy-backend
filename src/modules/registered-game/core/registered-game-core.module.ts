import { Module } from '@nestjs/common';
import { RegisteredGame } from './domain/registered-game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisteredGameCoreService } from './registered-game-core.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegisteredGame])],
  providers: [RegisteredGameCoreService],
  exports: [RegisteredGameCoreService],
})
export class RegisteredGameCoreModule {}
