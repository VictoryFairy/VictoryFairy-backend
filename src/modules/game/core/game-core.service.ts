import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from './domain/game.entity';
import { Repository } from 'typeorm';
import { BatchUpdateGameDto } from '../dto/batch-update-game.dto';

@Injectable()
export class GameCoreService {
  private readonly logger = new Logger(GameCoreService.name);
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  async getOneWithTeamAndStadium(gameId: string): Promise<Game> {
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
      throw new NotFoundException(`해당 경기를 찾을 수 없습니다`);
    }
    return game;
  }

  async getOneWithTeams(gameId: string): Promise<Game> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: { home_team: true, away_team: true, winning_team: true },
    });
    if (!game) {
      throw new NotFoundException(`해당 경기를 찾을 수 없습니다`);
    }
    return game;
  }

  async findGamesByDate(date: string): Promise<Game[]> {
    return this.gameRepo.find({ where: { date } });
  }

  async updateInProgressGame(
    gameId: string,
    currentStatus: BatchUpdateGameDto,
  ) {
    if (currentStatus.awayScore === null || currentStatus.homeScore === null)
      return;
    try {
      const { homeScore, awayScore, status } = currentStatus;
      const game = await this.gameRepo.findOne({
        where: { id: gameId },
        relations: { home_team: true, away_team: true, winning_team: true },
      });

      game.updateInProgressMatch({ status, homeScore, awayScore });

      await this.gameRepo.save(game);
    } catch (error) {
      this.logger.log(
        `Score for Game ${gameId} updated. homeScore: ${currentStatus.homeScore}, awayScore: ${currentStatus.awayScore}, status: ${currentStatus.status}`,
      );
    }
  }

  async updateFinishedMatch(gameId: string, currentStatus: BatchUpdateGameDto) {
    if (currentStatus.awayScore === null || currentStatus.homeScore === null)
      return;
    const { homeScore, awayScore, status } = currentStatus;
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: { home_team: true, away_team: true, winning_team: true },
    });
    game.updateFinishedMatch({ status, homeScore, awayScore });

    await this.gameRepo.save(game);
  }
}
