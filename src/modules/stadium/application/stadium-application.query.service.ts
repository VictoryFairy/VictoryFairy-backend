import { Injectable } from '@nestjs/common';
import { EntityManager, Not } from 'typeorm';
import { Stadium } from '../core/domain/stadium.entity';

@Injectable()
export class StadiumApplicationQueryService {
  constructor(private readonly entityManager: EntityManager) {}

  async findAll(name?: string): Promise<Stadium[]> {
    if (name) {
      return await this.entityManager.find(Stadium, {
        where: { name, full_name: Not('등록되어 있지 않은 경기장') },
      });
    }
    return await this.entityManager.find(Stadium, {
      where: { full_name: Not('등록되어 있지 않은 경기장') },
    });
  }
}
