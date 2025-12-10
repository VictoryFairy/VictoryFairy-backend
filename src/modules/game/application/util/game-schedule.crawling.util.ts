import axios, { AxiosResponse } from 'axios';
import { Stadium } from 'src/modules/stadium/entities/stadium.entity';
import { Team } from 'src/modules/team/core/domain/team.entity';
import {
  IGameData,
  IRawScheduleList,
  ITeamAndScore,
  TGameSchedule,
  TTeam,
} from 'src/modules/game/application/util/crawling-game.type';
import { EntityManager } from 'typeorm';
import { teamNameToTeamId } from 'src/common/utils/teamid-mapper';
import {
  convertDateFormat,
  isNotTimeFormat,
} from 'src/common/utils/time-format';
import { Game } from 'src/modules/game/core/domain/game.entity';
import { Logger } from '@nestjs/common';

type UpsertOptions = {
  year: number;
  month: number;
  em: EntityManager;
  logger?: Logger;
};

/**
 * 크롤링 관련 로직:
 * Thanks to EvansKJ57
 */
export async function upsertSchedules({
  year,
  month,
  em,
  logger,
}: UpsertOptions): Promise<void> {
  try {
    const response = await tryFetchSchedule(year, month);
    if (!response) {
      console.error(
        `Failed to fetch schedule after retry for ${year}-${month}`,
      );
      return;
    }

    const convertRowsToArray = response.data.rows.map((row) =>
      extractTextFromHtml(row.row),
    );

    const refinedGameData: TGameSchedule = refineGamesData(
      convertRowsToArray,
      year,
    );

    const doubleHeaderProcessedGameData: TGameSchedule =
      processDoubleHeader(refinedGameData);

    await upsertMany(doubleHeaderProcessedGameData, em, logger);
  } catch (error) {
    console.error(
      `Unexpected error while processing schedules for ${year}-${month}:`,
      error,
    );
  }
}

/**
 * 게임 일정을 크롤링하여 반환합니다.
 * @param year 연도
 * @param month 월
 * @returns 크롤링한 게임 데이터 배열
 */
export async function crawlGameSchedule({
  year,
  month,
}: {
  year: number;
  month: number;
}): Promise<IGameData[]> {
  try {
    const response = await tryFetchSchedule(year, month);
    if (!response) {
      console.error(
        `Failed to fetch schedule after retry for ${year}-${month}`,
      );
      return [];
    }

    const convertRowsToArray = response.data.rows.map((row) =>
      extractTextFromHtml(row.row),
    );

    const refinedGameData: IGameData[] = refineGamesData(
      convertRowsToArray,
      year,
    );

    const doubleHeaderProcessedGameData: IGameData[] =
      processDoubleHeader(refinedGameData);

    return doubleHeaderProcessedGameData;
  } catch (error) {
    console.error(
      `Unexpected error while processing schedules for ${year}-${month}:`,
      error,
    );
    return [];
  }
}

// 재시도 로직이 포함된 axios.post 래퍼 함수
async function tryFetchSchedule(
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
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
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

function extractTextFromHtml(
  data: IRawScheduleList['rows'][number]['row'],
): string[] {
  return data.map((row) => {
    return row.Text.replace(/<[^>]*>/g, '');
  });
}

function refineGamesData(rawData: string[][], year: number): TGameSchedule {
  const groupedData: TGameSchedule = [];
  let currentDate: string = '';

  rawData.forEach((entry) => {
    let date, time, game, review, stadium, status;

    if (entry.length === 9) {
      [date, time, game, review, , , , stadium, status] = entry;
    } else if (entry.length === 8) {
      [time, game, review, , , , stadium, status] = entry;
    } else {
      return;
    }

    if (date && isNotTimeFormat(date)) {
      currentDate = `${year}-${convertDateFormat(date)}`;
    }

    if (currentDate) {
      const { homeTeam, awayTeam } = getTeamAndScore(game);

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

function processDoubleHeader(schedule: TGameSchedule): TGameSchedule {
  const idCount = new Map<string, number>();
  const result: TGameSchedule = [];

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

function getTeamAndScore(gameString: string): {
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

async function upsertMany(
  games: IGameData[],
  em: EntityManager,
  logger?: Logger,
): Promise<void> {
  const localLogger = logger ? logger : console;
  if (!games || games.length === 0) {
    localLogger.log('No games to save');
    return;
  }

  localLogger.log(`Saving ${games.length} games to database`);
  try {
    // DataSource를 사용하여 트랜잭션으로 게임 데이터 저장
    await em.transaction(async (manager) => {
      // 팀과 구장 정보 미리 로드
      const teams = await manager.getRepository(Team).find();
      const stadiums = await manager.getRepository(Stadium).find();

      const teamMaps = new Map<string, Team>();
      const stadiumMaps = new Map<string, Stadium>();
      teams.forEach((team) => teamMaps.set(team.name, team));
      stadiums.forEach((stadium) => stadiumMaps.set(stadium.name, stadium));

      // 각 게임 데이터 처리
      for (const gameData of games) {
        // 게임 엔티티 생성 또는 업데이트
        const { id, date, time, status, homeScore, awayScore } = gameData;

        // 팀, 스타디움 확인 후 없으면 저장 후 맵에 추가
        let [homeTeam, awayTeam, stadium] = [
          teamMaps.get(gameData.homeTeam),
          teamMaps.get(gameData.awayTeam),
          stadiumMaps.get(gameData.stadium),
        ];
        if (!homeTeam) {
          homeTeam = await manager.save(Team, { name: gameData.homeTeam });
          teamMaps.set(gameData.homeTeam, homeTeam);
        }
        if (!awayTeam) {
          awayTeam = await manager.save(Team, { name: gameData.awayTeam });
          teamMaps.set(gameData.awayTeam, awayTeam);
        }
        if (!stadium) {
          stadium = await manager.save(Stadium, {
            name: gameData.stadium,
            full_name: '등록되어 있지 않은 경기장',
            latitude: 0,
            longitude: 0,
          });
          stadiumMaps.set(gameData.stadium, stadium);
        }

        const game = Game.create({
          id,
          date,
          time,
          status,
          homeTeamScore: homeScore ?? null,
          awayTeamScore: awayScore ?? null,
          homeTeam,
          awayTeam,
          stadium,
        });

        // 더블헤더 처리 및 게임 저장
        try {
          if (!game.id.endsWith('0')) {
            const preDoubleHeaderGameId = `${game.id.slice(0, -1)}0`;
            await manager.delete(Game, {
              id: preDoubleHeaderGameId,
            });
          }

          await manager.upsert(Game, game, ['id']);
        } catch (error) {
          localLogger.error('Error saving game:', error);
          throw error;
        }
      }
    });
  } catch (error) {
    localLogger.error('Error saving games to database', error.stack);
    throw error;
  }
}
