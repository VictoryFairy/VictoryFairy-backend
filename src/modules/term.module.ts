import { Module } from '@nestjs/common';
import { RedisModule } from './redis.module';
import { TermService } from 'src/services/term.service';
import { UserTerm } from 'src/entities/user-term.entity';
import { Term } from 'src/entities/term.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [RedisModule, TypeOrmModule.forFeature([Term, UserTerm])],
  providers: [TermService],
  exports: [TermService],
})
export class TermModule {}
