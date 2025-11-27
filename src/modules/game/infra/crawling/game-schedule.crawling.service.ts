import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import {
  IGameData,
  IRawScheduleList,
  ITeamAndScore,
  TGameSchedule,
  TTeam,
} from 'src/modules/scheduling/crawling-game.type';
import axios from 'axios';
import {
  convertDateFormat,
  isNotTimeFormat,
} from 'src/common/utils/time-format';
import { teamNameToTeamId } from 'src/common/utils/teamid-mapper';

@Injectable()
export class GameScheduleCrawlingService {
  constructor() {}
  /**
   * 크롤링 관련 로직:
   * Thanks to EvansKJ57
   */
  async crawlGameSchedule({
    year,
    month,
  }: {
    year: number;
    month: number;
  }): Promise<IGameData[]> {
    try {
      const response = await this.tryFetchSchedule(year, month);
      if (!response) {
        console.error(
          `Failed to fetch schedule after retry for ${year}-${month}`,
        );
        return;
      }

      const convertRowsToArray = response.data.rows.map((row) =>
        this.extractTextFromHtml(row.row),
      );

      const refinedGameData: IGameData[] = this.refineGamesData(
        convertRowsToArray,
        year,
      );

      const doubleHeaderProcessedGameData: IGameData[] =
        this.processDoubleHeader(refinedGameData);

      return doubleHeaderProcessedGameData;
    } catch (error) {
      console.error(
        `Unexpected error while processing schedules for ${year}-${month}:`,
        error,
      );
    }
  }

  private async tryFetchSchedule(
    year: number,
    month: number,
  ): Promise<AxiosResponse<IRawScheduleList> | null> {
    try {
      return await axios.post<IRawScheduleList>(
        'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
        {
          leId: 1,
          srIdList: [0, 3, 4, 5, 7].join(','),
          seasonId: year,
          gameMonth: month,
          teamid: '',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
        },
      );
    } catch (error) {
      try {
        return await axios.post<IRawScheduleList>(
          'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
          {
            leId: 1,
            srIdList: [0, 3, 4, 5, 7].join(','),
            seasonId: year,
            gameMonth: month,
            teamid: '',
          },
          {
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded; charset=UTF-8',
            },
          },
        );
      } catch (retryError) {
        console.error(
          `Retry failed for schedule fetch ${year}-${month}:`,
          retryError,
        );
        return null;
      }
    }
  }

  private extractTextFromHtml(
    data: IRawScheduleList['rows'][number]['row'],
  ): string[] {
    return data.map((row) => {
      return row.Text.replace(/<[^>]*>/g, '');
    });
  }

  private refineGamesData(rawData: string[][], year: number): TGameSchedule {
    const groupedData: TGameSchedule = [];
    let currentDate: string = '';

    rawData.forEach((entry) => {
      let date, time, game, review, highlight, channel, empty1, stadium, status;

      if (entry.length === 9) {
        [
          date,
          time,
          game,
          review,
          highlight,
          channel,
          empty1,
          stadium,
          status,
        ] = entry;
      } else if (entry.length === 8) {
        [time, game, review, highlight, channel, empty1, stadium, status] =
          entry;
      } else {
        return;
      }

      if (date && isNotTimeFormat(date)) {
        currentDate = `${year}-${convertDateFormat(date)}`;
      }

      if (currentDate) {
        const { homeTeam, awayTeam } = this.getTeamAndScore(game);

        const gameData: IGameData = {
          id:
            currentDate.replaceAll('-', '') +
            teamNameToTeamId[awayTeam.name] +
            teamNameToTeamId[homeTeam.name] +
            '0',
          date: currentDate,
          time,
          homeTeam: TTeam[homeTeam.name],
          awayTeam: TTeam[awayTeam.name],
          stadium,
          status,
        };

        if (review === '리뷰') {
          gameData['winner'] =
            homeTeam.score > awayTeam.score
              ? TTeam[homeTeam.name]
              : homeTeam.score < awayTeam.score
                ? TTeam[awayTeam.name]
                : null;
          gameData['homeScore'] = homeTeam.score;
          gameData['awayScore'] = awayTeam.score;
          gameData['status'] = '경기종료';
        } else if (review === '프리뷰') {
          gameData['status'] = '경기전';
        }

        groupedData.push(gameData);
      }
    });

    return groupedData;
  }

  private processDoubleHeader(schedule: IGameData[]): IGameData[] {
    const idCount = new Map<string, number>();
    const result: IGameData[] = [];

    for (const game of schedule) {
      const id = game.id;
      if (id.endsWith('0')) {
        const baseId = id.slice(0, -1);
        idCount.set(baseId, (idCount.get(baseId) ?? 0) + 1);
      }
    }

    for (const game of schedule) {
      const id = game.id;
      if (id.endsWith('0')) {
        const baseId = id.slice(0, -1);
        const count = idCount.get(baseId) ?? 0;
        if (count > 1) {
          const currentIndex = result.filter((g) =>
            g.id.startsWith(baseId),
          ).length;
          game.id = `${baseId}${currentIndex + 1}`;
        }
      }
      result.push(game);
    }

    return result;
  }

  private getTeamAndScore(gameString: string): {
    [team: string]: ITeamAndScore;
  } {
    const [awayTeamString, homeTeamString] = gameString.split('vs');

    if (!awayTeamString || !homeTeamString) {
      return {};
    }

    const splitScoreAndTeam = (teamString: string, isRightSide: boolean) => {
      const match = isRightSide
        ? teamString.match(/(\d+)(\D+)$/)
        : teamString.match(/^(\D+)(\d+)$/);

      if (match) {
        return {
          name: (isRightSide ? match[2].trim() : match[1].trim()) as TTeam,
          score: isRightSide ? parseInt(match[1], 10) : parseInt(match[2], 10),
        };
      }
      return { name: teamString as TTeam, score: null };
    };

    const homeTeam = splitScoreAndTeam(homeTeamString.trim(), true);
    const awayTeam = splitScoreAndTeam(awayTeamString.trim(), false);

    return { homeTeam, awayTeam };
  }
}
