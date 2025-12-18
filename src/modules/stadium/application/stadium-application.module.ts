import { Module } from '@nestjs/common';
import { StadiumCoreModule } from '../core/stadium-core.module';
import { StadiumController } from './stadium.controller';
import { StadiumApplicationQueryService } from './stadium-application.query.service';

@Module({
  imports: [StadiumCoreModule],
  controllers: [StadiumController],
  providers: [StadiumApplicationQueryService],
  exports: [],
})
export class StadiumApplicationModule {}
