import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ParkingInfo } from 'src/entities/parking-info.entity';
import { Repository } from 'typeorm';
import { StadiumService } from './stadium.service';
import { parkingInfoSeeder } from 'src/migration/seeds/data/parking-info.seed';

@Injectable()
export class ParkingInfoService {
  constructor(
    @InjectRepository(ParkingInfo)
    private readonly parkingInfoRepository: Repository<ParkingInfo>,
    private readonly stadiumService: StadiumService,
  ) {}

  async seed() {
    await this.parkingInfoRepository.manager.transaction(async (manager) => {
      for (const seed of parkingInfoSeeder) {
        const stadium = await this.stadiumService.findByName(seed.stadium);

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
    const stadium = await this.stadiumService.findOne(stadiumId);
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
