import { Module } from '@nestjs/common';
import { RedisModule } from '../../core/redis/redis.module';
import { UserTerm } from 'src/modules/term/entities/user-term.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from './entities/term.entity';
import { TermService } from './term.service';

@Module({
  imports: [RedisModule, TypeOrmModule.forFeature([Term, UserTerm])],
  providers: [TermService],
  exports: [TermService],
})
export class TermModule {}
