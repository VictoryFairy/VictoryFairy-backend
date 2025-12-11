import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingInfo } from './domain/parking-info.entity';

@Injectable()
export class ParkingInfoCoreService {
  constructor(
    @InjectRepository(ParkingInfo)
    private readonly parkingInfoRepository: Repository<ParkingInfo>,
  ) {}

  async findAll(): Promise<ParkingInfo[]> {
    return await this.parkingInfoRepository.find({
      relations: { stadium: true },
    });
  }

  async findByStadiumId(stadiumId: number): Promise<ParkingInfo[]> {
    return await this.parkingInfoRepository.find({
      where: { stadium: { id: stadiumId } },
      relations: { stadium: true },
    });
  }
}
