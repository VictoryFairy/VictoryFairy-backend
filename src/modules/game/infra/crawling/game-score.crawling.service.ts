import { Injectable, Logger } from '@nestjs/common';
import { BatchUpdateGameDto } from '../../dto/batch-update-game.dto';
import parse from 'node-html-parser';
import axios from 'axios';
import { isNumber } from 'src/common/utils/is-number.util';

@Injectable()
export class GameScoreCrawlingService {
  private readonly logger = new Logger(GameScoreCrawlingService.name);

  constructor() {}

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
