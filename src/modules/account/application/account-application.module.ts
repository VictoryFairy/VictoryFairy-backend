import { Module } from '@nestjs/common';
import { AuthController } from './infra/controller/auth.controller';
import { UserController } from './infra/controller/user.controller';
import { AccountApplicationCommandService } from './account-application.command.service';
import { AccountCoreModule } from '../core/account-core.module';
import { TermCoreModule } from 'src/modules/term/core/term-core.module';
import { AccountApplicationQueryService } from './account-application.query.service';
import { AwsS3Module } from 'src/infra/aws-s3/aws-s3.module';
import { TeamModule } from 'src/modules/team/team.module';
import { RankCoreModule } from 'src/modules/rank/core/rank-core.module';

@Module({
  imports: [
    TermCoreModule,
    AccountCoreModule,
    RankCoreModule,
    AwsS3Module,
    TeamModule,
  ],
  providers: [AccountApplicationCommandService, AccountApplicationQueryService],
  exports: [],
  controllers: [AuthController, UserController],
})
export class AccountApplicationModule {}
