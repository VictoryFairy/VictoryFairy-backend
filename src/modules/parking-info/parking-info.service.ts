import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StadiumCoreService } from '../stadium/core/stadium-core.service';
import { parkingInfoSeeder } from 'src/tools/seeds/data/parking-info.seed';
import { ParkingInfo } from './entities/parking-info.entity';

@Injectable()
export class ParkingInfoService {
  constructor(
    @InjectRepository(ParkingInfo)
    private readonly parkingInfoRepository: Repository<ParkingInfo>,
    private readonly stadiumCoreService: StadiumCoreService,
  ) {}

  async seed() {
    await this.parkingInfoRepository.manager.transaction(async (manager) => {
      for (const seed of parkingInfoSeeder) {
        const stadium = await this.stadiumCoreService.findByName(seed.stadium);

        await manager.getRepository(ParkingInfo).upsert(
          {
            name: seed.name,
            latitude: seed.position.lat,
            longitude: seed.position.lng,
            address: seed.address,
            link: seed.link,
            stadium: stadium,
          },
          ['name'],
        );
      }
    });
  }

  async findByStadiumId(stadiumId: number): Promise<ParkingInfo[]> {
    const stadium = await this.stadiumCoreService.findOne(stadiumId);
    const parkingInfos = await this.parkingInfoRepository.find({
      where: { stadium },
      relations: { stadium: true },
    });

    return parkingInfos;
  }

  async findAll(): Promise<ParkingInfo[]> {
    const parkingInfos = await this.parkingInfoRepository.find({
      relations: { stadium: true },
    });

    return parkingInfos;
  }
}
