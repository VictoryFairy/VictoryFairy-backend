import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Team } from '../core/domain/team.entity';

@Injectable()
export class TeamQueryService {
  constructor(private readonly entityManager: EntityManager) {}

  async findAllByName(name: string): Promise<Team[]> {
    return await this.entityManager.find(Team, {
      where: { name },
    });
  }
}
