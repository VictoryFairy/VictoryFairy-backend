import { Module } from '@nestjs/common';
import { CheeringSongCoreModule } from '../core/cheering-song-core.module';
import { CheeringSongController } from './cheering-song.controller';
import { CheeringSongApplicationCommandService } from './cheering-song-application.command.service';
import { CheeringSongApplicationQueryService } from './cheering-song-application.query.service';

@Module({
  imports: [CheeringSongCoreModule],
  controllers: [CheeringSongController],
  providers: [
    CheeringSongApplicationCommandService,
    CheeringSongApplicationQueryService,
  ],
  exports: [],
})
export class CheeringSongApplicationModule {}
