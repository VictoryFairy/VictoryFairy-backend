import { Module } from '@nestjs/common';
import { GameService } from 'src/modules/game/game.service';
import { GameController } from 'src/modules/game/game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TeamModule } from '../team/team.module';
import { StadiumModule } from '../stadium/stadium.module';
import { Game } from './entities/game.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Game]),
    TeamModule,
    StadiumModule,
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
