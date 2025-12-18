import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from 'src/modules/term/core/domain/term.entity';
import { TermCoreService } from 'src/modules/term/core/term-core.service';
import { TermRedisService } from 'src/modules/term/core/term-redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Term])],
  providers: [TermCoreService, TermRedisService],
  exports: [TermCoreService, TermRedisService],
})
export class TermCoreModule {}
