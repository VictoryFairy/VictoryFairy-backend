import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingInfoController } from 'src/controllers/parking-info.controller';
import { ParkingInfo } from 'src/entities/parking-info.entity';
import { ParkingInfoService } from 'src/services/parking-info.service';
import { StadiumModule } from './stadium.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingInfo]), StadiumModule, AuthModule],
  controllers: [ParkingInfoController],
  providers: [ParkingInfoService],
  exports: [ParkingInfoService],
})
export class ParkingInfoModule {}
