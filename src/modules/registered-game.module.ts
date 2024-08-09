import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisteredGameController } from 'src/controllers/registered-game.controller';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { RegisteredGameService } from 'src/services/registered-game.service';
import { GameModule } from './game.module';
import { TeamModule } from './team.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegisteredGame]),
    AuthModule,
    GameModule,
    TeamModule,
    AuthModule,
  ],
  controllers: [RegisteredGameController],
  providers: [RegisteredGameService],
})
export class RegisteredGameModule {}
