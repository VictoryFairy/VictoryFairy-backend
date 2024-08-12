import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { StadiumController } from 'src/controllers/stadium.controller';
import { Stadium } from 'src/entities/stadium.entity';
import { StadiumService } from 'src/services/stadium.service';
@Module({
  imports: [TypeOrmModule.forFeature([Stadium]), AuthModule],
  controllers: [StadiumController],
  providers: [StadiumService],
  exports: [StadiumService],
})
export class StadiumModule {}
