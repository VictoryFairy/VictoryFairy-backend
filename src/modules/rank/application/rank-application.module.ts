import { Module } from '@nestjs/common';
import { RankCoreModule } from '../core/rank-core.module';
import { RankApplicationCommandService } from './rank-application.command.service';
import { RankApplicationQueryService } from './rank-application.query.service';
import { RankController } from '../rank.controller';
@Module({
  imports: [RankCoreModule],
  providers: [RankApplicationCommandService, RankApplicationQueryService],
  controllers: [RankController],
})
export class RankApplicationModule {}
