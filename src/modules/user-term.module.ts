import { Module } from '@nestjs/common';
import { UserTermService } from '../services/user-term.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTerm } from 'src/entities/user-term.entity';
import { TermModule } from './term.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserTerm]), TermModule],
  providers: [UserTermService],
  exports: [UserTermService],
})
export class UserTermModule {}
