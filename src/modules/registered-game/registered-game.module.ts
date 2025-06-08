import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisteredGameController } from 'src/modules/registered-game/registered-game.controller';
import { RegisteredGame } from 'src/modules/registered-game/entities/registered-game.entity';
import { RegisteredGameService } from 'src/modules/registered-game/registered-game.service';
import { TeamModule } from '../team/team.module';
import { AwsS3Module } from '../../core/aws-s3/aws-s3.module';
import { GameModule } from '../game/game.module';
import { RankModule } from '../rank/rank.module';
import { RegisteredGameRepository } from './repository/registered-game.repository';
import { REGISTERED_GAME_REPOSITORY } from './repository/registered-game.repository.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegisteredGame]),
    forwardRef(() => GameModule),
    TeamModule,
    RankModule,
    AwsS3Module,
  ],
  controllers: [RegisteredGameController],
  providers: [
    RegisteredGameService,
    { provide: REGISTERED_GAME_REPOSITORY, useClass: RegisteredGameRepository },
  ],
  exports: [RegisteredGameService],
})
export class RegisteredGameModule {}
