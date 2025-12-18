import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from './domain/game.entity';
import { Repository } from 'typeorm';
import { GameNotFoundError } from './domain/error/game.error';
import {
  GameWithTeams,
  GameWithTeamsAndStadium,
  UpdateGameScoreInput,
} from './types/game.interface';

@Injectable()
export class GameCoreService {
  private readonly logger = new Logger(GameCoreService.name);
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  async getOneWithTeamAndStadium(
    gameId: string,
  ): Promise<GameWithTeamsAndStadium> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: {
        stadium: true,
        home_team: true,
        away_team: true,
        winning_team: true,
      },
    });
    if (!game) {
      throw new GameNotFoundError();
    }
    return game as GameWithTeamsAndStadium;
  }

  async getOneWithTeams(gameId: string): Promise<GameWithTeams> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: { home_team: true, away_team: true, winning_team: true },
    });
    if (!game) {
      throw new GameNotFoundError();
    }
    return game as GameWithTeams;
  }

  async findGamesByDate(date: string): Promise<Game[]> {
    return this.gameRepo.find({ where: { date } });
  }

  async updateInProgressGame(
    gameId: string,
    input: UpdateGameScoreInput,
  ): Promise<void> {
    if (input.awayScore === null || input.homeScore === null) return;
    try {
      const { homeScore, awayScore, status } = input;
      const game = await this.gameRepo.findOne({
        where: { id: gameId },
        relations: { home_team: true, away_team: true, winning_team: true },
      });
      game.updateInProgressMatch({ status, homeScore, awayScore });
      await this.gameRepo.save(game);
    } catch (error) {
      this.logger.log(
        `Score for Game ${gameId} updated. homeScore: ${input.homeScore}, awayScore: ${input.awayScore}, status: ${input.status}`,
      );
    }
  }

  async updateFinishedMatch(
    gameId: string,
    input: UpdateGameScoreInput,
  ): Promise<void> {
    if (input.awayScore === null || input.homeScore === null) return;
    const { homeScore, awayScore, status } = input;
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: { home_team: true, away_team: true, winning_team: true },
    });
    game.updateFinishedMatch({ status, homeScore, awayScore });
    await this.gameRepo.save(game);
  }
}
