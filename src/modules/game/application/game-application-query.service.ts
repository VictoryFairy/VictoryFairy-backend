import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ResGameDailyDto } from '../dto/response/res-game-daily.dto';
import { Game } from '../core/domain/game.entity';
import { RegisteredGame } from 'src/modules/registered-game/core/domain/registered-game.entity';
import { plainToInstance } from 'class-transformer';
import { GameDto } from '../dto/game.dto';

@Injectable()
export class GameApplicationQueryService {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  async GetDailyGamesWithUserRegistration(data: {
    year: number;
    month: number;
    day: number;
    userId: number;
  }): Promise<ResGameDailyDto> {
    const { year, month, day, userId } = data;
    const date = this.getDateString(year, month, day);

    const result = (await this.em
      .createQueryBuilder(Game, 'g')
      .leftJoinAndSelect('g.home_team', 'home_team')
      .leftJoinAndSelect('g.away_team', 'away_team')
      .leftJoinAndSelect('g.stadium', 'stadium')
      .leftJoinAndSelect('g.winning_team', 'winning_team')
      .leftJoinAndMapOne(
        'g.isAlreadyRegistered',
        RegisteredGame,
        'rg',
        'rg.game_id = g.id AND rg.user_id = :userId',
        { userId },
      )

      .where('g.date = :date', { date })
      .getMany()) as unknown as (Game & {
      isAlreadyRegistered: RegisteredGame;
    })[];

    const gamesDto = plainToInstance(GameDto, result);

    const groupedGames = this.groupGamesByTeam(gamesDto);
    const registeredGameIds = result
      .filter((game) => game.isAlreadyRegistered)
      .map((game) => game.id);
    return {
      games: groupedGames,
      registeredGameIds,
    };
  }

  async getGameById(gameId: string): Promise<GameDto | null> {
    const game = await this.em.findOne(Game, {
      where: { id: gameId },
      relations: {
        home_team: true,
        away_team: true,
        winning_team: true,
        stadium: true,
      },
    });

    return game ? plainToInstance(GameDto, game) : null;
  }
  async getTodayGames(data: {
    year: number;
    month: number;
    day: number;
  }): Promise<GameDto[]> {
    const { year, month, day } = data;
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const games = await this.em.find(Game, {
      where: { date: dateString },
      relations: {
        home_team: true,
        away_team: true,
        winning_team: true,
        stadium: true,
      },
    });
    return games ? plainToInstance(GameDto, games) : [];
  }

  private getDateString(year: number, month: number, day: number): string {
    const y = String(year);
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private groupGamesByTeam(games: GameDto[]): Record<string, GameDto[]> {
    const map: Record<string, GameDto[]> = {};

    for (const game of games) {
      const key = game.id.slice(8, -1);

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(game);
    }

    return map;
  }
}
