import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisteredGameController } from 'src/modules/registered-game/registered-game.controller';
import { RegisteredGame } from 'src/modules/registered-game/entities/registered-game.entity';
import { RegisteredGameService } from 'src/modules/registered-game/registered-game.service';
import { TeamModule } from '../team/team.module';
import { AwsS3Module } from '../../core/aws-s3/aws-s3.module';
import { GameModule } from '../game/game.module';
import { RankModule } from '../rank/rank.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegisteredGame]),
    GameModule,
    TeamModule,
    RankModule,
    AwsS3Module,
  ],
  controllers: [RegisteredGameController],
  providers: [RegisteredGameService],
  exports: [RegisteredGameService],
})
export class RegisteredGameModule {}
