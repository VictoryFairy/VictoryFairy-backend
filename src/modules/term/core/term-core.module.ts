import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from '../entities/term.entity';
import { TermCoreService } from './term-core.service';

@Module({
  imports: [TypeOrmModule.forFeature([Term])],
  providers: [TermCoreService],
  exports: [TermCoreService],
})
export class TermCoreModule {}
