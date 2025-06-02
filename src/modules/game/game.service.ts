import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import parse from 'node-html-parser';
import * as moment from 'moment-timezone';
import { BatchUpdateGameDto } from 'src/modules/game/dto/batch-update-game.dto';
import { isNumber } from 'src/common/utils/is-number.util';
import { Game } from './entities/game.entity';
import axios from 'axios';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async findAllDaily(
    year: number,
    month: number,
    day: number,
  ): Promise<Game[]> {
    const dateString = moment
      .utc({ year, month: month - 1, day })
      .format('YYYY-MM-DD');

    const games = await this.gameRepository.find({
      where: {
        date: dateString,
      },
      relations: {
        home_team: true,
        away_team: true,
        winning_team: true,
        stadium: true,
      },
    });

    return games;
  }

  async findOne(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: {
        home_team: true,
        away_team: true,
        winning_team: true,
        stadium: true,
      },
    });
    if (!game) {
      throw new NotFoundException(`Game with id ${gameId} not found.`);
    }
    return game;
  }

  async findGamesByDate(date: string) {
    const games = await this.gameRepository.find({
      where: {
        date,
      },
    });
    return games;
  }

  /** 추후 레디스에 캐싱하는 방식으로 리팩토링 필요 */
  async updateStatusRepeatedly(
    gameId: string,
    currentStatus: BatchUpdateGameDto,
  ): Promise<void> {
    if (currentStatus.awayScore === null || currentStatus.homeScore === null)
      return;
    return await this.gameRepository.manager.transaction(async (manager) => {
      const game = await this.findOne(gameId);
      game.home_team_score = currentStatus.homeScore;
      game.away_team_score = currentStatus.awayScore;
      if (currentStatus.status !== null) {
        game.status = currentStatus.status;
      }
      await manager.update(Game, { id: gameId }, game);
      this.logger.log(
        `Score for Game ${gameId} updated. homeScore: ${currentStatus.homeScore}, awayScore: ${currentStatus.awayScore}, status: ${currentStatus.status}`,
      );
    });
  }

  async updateStatusFinally(
    gameId: string,
    currentStatus: BatchUpdateGameDto,
  ): Promise<void> {
    if (currentStatus.awayScore === null || currentStatus.homeScore === null)
      return;
    return await this.gameRepository.manager.transaction(async (manager) => {
      const game = await this.findOne(gameId);
      game.status = currentStatus.status;
      if (currentStatus.awayScore > currentStatus.homeScore) {
        game.winning_team = game.away_team;
      } else if (currentStatus.awayScore < currentStatus.homeScore) {
        game.winning_team = game.home_team;
      } else {
        game.winning_team = null;
      }

      await manager.update(Game, { id: gameId }, game);
    });
  }

  async getCurrentGameStatus(
    leagueId: number,
    seriesId: number,
    gameId: string,
    gyear: number,
  ): Promise<BatchUpdateGameDto> {
    const extractStatus = (htmlString: string) => {
      const root = parse(htmlString);
      const statusElement = root.querySelector('span.date');

      const status: string | null =
        (statusElement?.innerText?.match(/\[(.*?)\]/) || [])[1] ?? null;

      return {
        status,
      };
    };

    const extractScore = (htmlString: string) => {
      const root = parse(htmlString);
      const homeScoreElement = root.querySelector('.teamHome em');
      const awayScoreElement = root.querySelector('.teamAway em');

      const homeScore: number | null =
        homeScoreElement && isNumber(homeScoreElement.innerText)
          ? parseInt(homeScoreElement.innerText)
          : null;
      const awayScore: number | null =
        awayScoreElement && isNumber(awayScoreElement.innerText)
          ? parseInt(awayScoreElement.innerText)
          : null;

      return {
        homeScore: homeScore,
        awayScore: awayScore,
      };
    };

    const [scoreRes, statusRes] = await Promise.allSettled([
      axios.post(
        'https://www.koreabaseball.com/Game/LiveTextView1.aspx',
        { leagueId, seriesId, gameId, gyear },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
        },
      ),
      axios.post(
        'https://www.koreabaseball.com/Game/LiveTextView2.aspx',
        { leagueId, seriesId, gameId, gyear },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
        },
      ),
    ]);

    if (scoreRes.status === 'fulfilled' && statusRes.status === 'fulfilled') {
      const score = extractScore(scoreRes.value.data);
      const status = extractStatus(statusRes.value.data);
      return {
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        status: status.status,
      };
    }

    if (scoreRes.status === 'rejected' || statusRes.status === 'rejected') {
      this.logger.error(`Failed to get current game status for game ${gameId}`);
    }

    return {
      homeScore: null,
      awayScore: null,
      status: null,
    };
  }
}
