import { Module } from '@nestjs/common';
import { TermService } from '../services/term.service';
import { TermController } from '../controllers/term.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from 'src/entities/term.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Term])],
  controllers: [TermController],
  providers: [TermService],
  exports: [TermService],
})
export class TermModule {}
