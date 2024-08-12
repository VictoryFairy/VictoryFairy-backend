import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { TeamController } from 'src/controllers/team.controller';
import { Team } from 'src/entities/team.entity';
import { TeamService } from 'src/services/team.service';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), AuthModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
