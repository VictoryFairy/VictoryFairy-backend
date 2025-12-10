import { Module } from '@nestjs/common';
import { RegisteredGameCoreModule } from '../core/registered-game-core.module';
import { RegisteredGameApplicationCommandService } from './registered-game-application.command.service';
import { RegisteredGameController } from './registered-game.controller';
import { GameCoreModule } from 'src/modules/game/core/game-core.module';
import { RegisteredGameApplicationQueryService } from './registered-game-application.query.service';
import { TeamCoreModule } from 'src/modules/team/core/team-core.module';
import { RankCoreModule } from 'src/modules/rank/core/rank-core.module';
import { AwsS3Module } from 'src/infra/aws-s3/aws-s3.module';

@Module({
  imports: [
    RegisteredGameCoreModule,
    GameCoreModule,
    TeamCoreModule,
    RankCoreModule,
    AwsS3Module,
  ],
  providers: [
    RegisteredGameApplicationCommandService,
    RegisteredGameApplicationQueryService,
  ],
  controllers: [RegisteredGameController],
})
export class RegisteredGameApplicationModule {}
