import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ParkingInfo } from '../core/domain/parking-info.entity';
import { Stadium } from '../../stadium/core/domain/stadium.entity';
import { InjectEntityManager } from '@nestjs/typeorm';

@Injectable()
export class ParkingInfoApplicationQueryService {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<ParkingInfo[]> {
    return await this.em.find(ParkingInfo, {
      relations: { stadium: true },
    });
  }

  async findByStadiumId(stadiumId: number): Promise<ParkingInfo[]> {
    const stadium = await this.em.findOne(Stadium, {
      where: { id: stadiumId },
    });
    if (!stadium) {
      throw new NotFoundException(`Stadium with id ${stadiumId} is not found`);
    }
    return await this.em.find(ParkingInfo, {
      where: { stadium: { id: stadiumId } },
      relations: { stadium: true },
    });
  }
}
