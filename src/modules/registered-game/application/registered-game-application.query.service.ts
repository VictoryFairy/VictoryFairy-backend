import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as moment from 'moment';
import { RegisteredGameWithGameResponseDto } from './dto/response/res-registered-game-with-game.dto';
import { Between, EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { RegisteredGame } from '../core/domain/registered-game.entity';
import { RegisteredGameWithFullRelations } from '../core/types/registered-game.interface';

@Injectable()
export class RegisteredGameApplicationQueryService {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  async getAllMonthly(
    dateInfo: { year: number; month: number },
    userId: number,
  ): Promise<RegisteredGameWithGameResponseDto[]> {
    const { year, month } = dateInfo;
    const startDate = moment
      .tz(`${year}-${month.toString().padStart(2, '0')}-01`, 'Asia/Seoul')
      .startOf('day')
      .format('YYYY-MM-DD');
    const endDate = moment
      .tz(`${year}-${month.toString().padStart(2, '0')}-01`, 'Asia/Seoul')
      .endOf('month')
      .format('YYYY-MM-DD');

    const registeredGames = (await this.em.find(RegisteredGame, {
      where: {
        user: { id: userId },
        game: { date: Between(startDate, endDate) },
      },
      relations: {
        game: {
          home_team: true,
          away_team: true,
          stadium: true,
          winning_team: true,
        },
        cheering_team: true,
      },
      order: { game: { date: 'DESC' } },
    })) as RegisteredGameWithFullRelations[];

    return registeredGames.map((registeredGame) =>
      plainToInstance(RegisteredGameWithGameResponseDto, registeredGame, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async getOne(
    id: number,
    userId: number,
  ): Promise<RegisteredGameWithGameResponseDto> {
    const registeredGame = (await this.em.findOne(RegisteredGame, {
      where: { id, user: { id: userId } },
      relations: {
        game: {
          home_team: true,
          away_team: true,
          stadium: true,
          winning_team: true,
        },
        cheering_team: true,
      },
    })) as RegisteredGameWithFullRelations | null;

    if (!registeredGame) {
      throw new NotFoundException('Registered game not found');
    }

    return plainToInstance(RegisteredGameWithGameResponseDto, registeredGame, {
      excludeExtraneousValues: true,
    });
  }

  async countNewRegistrationsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.em.count(RegisteredGame, {
      where: { created_at: Between(startDate, endDate) },
    });
  }
}
