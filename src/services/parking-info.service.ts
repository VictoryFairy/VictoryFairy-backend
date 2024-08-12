import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ParkingInfo } from 'src/entities/parking-info.entity';
import { Repository } from 'typeorm';
import { StadiumService } from './stadium.service';
import { parkingInfoSeeder } from 'src/seeds/parking-info.seed';

@Injectable()
export class ParkingInfoService {
  constructor(
    @InjectRepository(ParkingInfo)
    private readonly parkingInfoRepository: Repository<ParkingInfo>,
    private readonly stadiumService: StadiumService,
  ) {}

  async seed() {
    await this.parkingInfoRepository.manager.transaction(async (manager) => {
      const savePromises = parkingInfoSeeder.map(async (seed) => {
        const parkingInfo = new ParkingInfo();
        parkingInfo.name = seed.name;
        parkingInfo.latitude = seed.position.lat;
        parkingInfo.longitude = seed.position.lng;
        parkingInfo.address = seed.address;
        parkingInfo.stadium = await this.stadiumService.findByName(
          seed.stadium,
        );
        return manager.save(parkingInfo);
      });

      await Promise.all(savePromises);
    });
  }

  async findByStadiumId(stadiumId: number): Promise<ParkingInfo[]> {
    const stadium = await this.stadiumService.findOne(stadiumId);
    const parkingInfos = await this.parkingInfoRepository.find({
      where: { stadium },
    });

    return parkingInfos;
  }

  async findAll(): Promise<ParkingInfo[]> {
    const parkingInfos = await this.parkingInfoRepository.find();

    return parkingInfos;
  }
}
