import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamSelectIdDto } from '../dto/internal/team-select-id.dto';
import { ITeamRepository } from './team.repository.interface';

@Injectable()
export class TeamRepository implements ITeamRepository {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
  ) {}

  async findAndSelectTeamId(): Promise<TeamSelectIdDto[]> {
    try {
      const result = await this.teamRepo.find({ select: { id: true } });
      return await Promise.all(
        result.map((team) => TeamSelectIdDto.createAndValidate(team)),
      );
    } catch (error) {
      throw new InternalServerErrorException('팀 조회 실패');
    }
  }

  async findOne(where: FindOptionsWhere<Team>): Promise<Team> {
    try {
      const team = await this.teamRepo.findOne({ where });
      return team;
    } catch (error) {
      throw new InternalServerErrorException('팀 조회 실패');
    }
  }

  async find(name?: string): Promise<Team[]> {
    try {
      const whereCondition = name
        ? { id: Between(1, 10), name }
        : { id: Between(1, 10) };
      return await this.teamRepo.find({
        where: whereCondition,
      });
    } catch (error) {
      throw new InternalServerErrorException('팀 조회 실패');
    }
  }

  async save(team: Team): Promise<Team> {
    try {
      return await this.teamRepo.save(team);
    } catch (error) {
      throw new InternalServerErrorException('팀 저장 실패');
    }
  }
}
