import { Module } from '@nestjs/common';
import { GameService } from 'src/services/game.service';
import { GameController } from 'src/controllers/game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from 'src/entities/game.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Game]),
  ],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
