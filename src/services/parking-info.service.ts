import { Injectable } from '@nestjs/common';
import { CreateParkingInfoDto } from './dto/create-parking-info.dto';
import { UpdateParkingInfoDto } from './dto/update-parking-info.dto';

@Injectable()
export class ParkingInfoService {
  create(createParkingInfoDto: CreateParkingInfoDto) {
    return 'This action adds a new parkingInfo';
  }

  findAll() {
    return `This action returns all parkingInfo`;
  }

  findOne(id: number) {
    return `This action returns a #${id} parkingInfo`;
  }

  update(id: number, updateParkingInfoDto: UpdateParkingInfoDto) {
    return `This action updates a #${id} parkingInfo`;
  }

  remove(id: number) {
    return `This action removes a #${id} parkingInfo`;
  }
}
