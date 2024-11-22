import axios from 'axios';
import { Game } from 'src/entities/game.entity';
import { Stadium } from 'src/entities/stadium.entity';
import { Team } from 'src/entities/team.entity';
import {
  IGameData,
  IRawScheduleList,
  ITeamAndScore,
  TGameSchedule,
  TTeam,
} from 'src/types/crawling-game.type';
import { DataSource } from 'typeorm';
import { convertDateFormat, isNotTimeFormat } from './time-format';
import { teamNameToTeamId } from './teamid-mapper';

type UpsertOptions = {
  year: number;
  month: number;
  dataSource: DataSource;
};

/**
 * 크롤링 관련 로직:
 * Thanks to EvansKJ57
 */
export async function upsertSchedules({
  year,
  month,
  dataSource,
}: UpsertOptions): Promise<void> {
  try {
    const response = await axios.post<IRawScheduleList>(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
      {
        leId: 1, // 1 => 1부 | 2 => 퓨처스 리그
        srIdList: [0, 3, 4, 5, 7].join(','), // 0 => 프로팀 경기 | 3,4,5,7 => 포스트 시즌
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

    const convertRowsToArray = response.data.rows.map((row) =>
      extractTextFromHtml(row.row),
    );

    const refinedGameData: TGameSchedule = refineGamesData(
      convertRowsToArray,
      year,
    );

    const doubleHeaderProcessedGameData: TGameSchedule =
      processDoubleHeader(refinedGameData);

    await upsertMany(doubleHeaderProcessedGameData, dataSource);
  } catch (error) {
    console.error(
      `Error while processing schedules for ${year}-${month}:`,
      error,
    );
    throw error;
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
    let date, time, game, review, highlight, channel, empty1, stadium, status;

    if (entry.length === 9) {
      [date, time, game, review, highlight, channel, empty1, stadium, status] =
        entry;
    } else if (entry.length === 8) {
      [time, game, review, highlight, channel, empty1, stadium, status] = entry;
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
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        stadium,
        status,
      };

      if (review === '리뷰') {
        gameData['winner'] =
          homeTeam.score > awayTeam.score
            ? homeTeam.name
            : homeTeam.score < awayTeam.score
              ? awayTeam.name
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
  gameSchedules: TGameSchedule,
  dataSource: DataSource,
): Promise<void> {
  await dataSource.manager.transaction(async (manager) => {
    const teams = await manager.getRepository(Team).find();
    const stadiums = await manager.getRepository(Stadium).find();

    for (const schedule of gameSchedules) {
      const game = new Game();
      game.id = schedule.id;
      game.date = schedule.date;
      game.time = schedule.time;
      game.status = schedule.status;
      game.home_team_score = schedule.homeScore ?? null;
      game.away_team_score = schedule.awayScore ?? null;
      game.winning_team = schedule.winner
        ? (teams.find((team) => team.name === schedule.winner) ?? null)
        : null;

      game.home_team =
        teams.find((team) => team.name === schedule.homeTeam) ??
        (await manager.getRepository(Team).save({ name: schedule.homeTeam }));

      if (!game.home_team) {
        console.log(
          '홈 팀이 누락되었거나 아직 로드되지 않았습니다:',
          game,
          schedule,
        );
        continue;
      }

      game.away_team =
        teams.find((team) => team.name === schedule.awayTeam) ??
        (await manager.getRepository(Team).save({ name: schedule.awayTeam }));

      if (!game.away_team) {
        console.log(
          '원정 팀이 누락되었거나 아직 로드되지 않았습니다:',
          game,
          schedule,
        );
        continue;
      }

      game.stadium =
        stadiums.find((stadium) => stadium.name === schedule.stadium) ??
        (await (async () => {
          await manager.getRepository(Stadium).upsert(
            {
              name: schedule.stadium,
              full_name: '등록되어 있지 않은 경기장',
              latitude: 0,
              longitude: 0,
            },
            ['name'],
          );

          return manager
            .getRepository(Stadium)
            .findOne({ where: { name: schedule.stadium } });
        })());

      if (!game.stadium) {
        console.log(
          '구장이 누락되었거나 아직 로드되지 않았습니다:',
          game,
          schedule,
        );
        continue;
      }

      if (!game.date || !game.time || !game.status) {
        console.log('필수 필드가 누락되었거나 잘못되었습니다:', game, schedule);
        continue;
      }

      try {
        if (!game.id.endsWith('0')) {
          const preDoubleHeaderGameId = `${game.id.slice(0, -1)}0`;
          await manager.delete(Game, {
            id: preDoubleHeaderGameId,
          });
        }
        await manager.upsert(Game, game, ['id']);
      } catch (error) {
        console.error('게임 저장 중 오류 발생:', error);
        throw error;
      }
    }
  });
}
