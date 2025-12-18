import { Module } from '@nestjs/common';
import { RankCoreModule } from '../core/rank-core.module';
import { RankApplicationCommandService } from './rank-application.command.service';
import { RankApplicationQueryService } from './rank-application.query.service';
import { RankController } from './rank.controller';
import { AccountCoreModule } from 'src/modules/account/core/account-core.module';
@Module({
  imports: [RankCoreModule, AccountCoreModule],
  providers: [RankApplicationCommandService, RankApplicationQueryService],
  controllers: [RankController],
})
export class RankApplicationModule {}
