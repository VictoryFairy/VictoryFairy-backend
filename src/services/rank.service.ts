import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { CreateRankDto } from 'src/dtos/rank.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';
import { RedisCachingService } from './redis-caching.service';

@Injectable()
export class RankService {
  private readonly logger = new Logger(RankService.name);
  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    @InjectRepository(Rank)
    private readonly rankRepository: Repository<Rank>,
    private readonly redisCachingService: RedisCachingService,
  ) {}

  /** 레디스 연결 시 랭킹 데이터 미리 저장 */
  @OnEvent(EventName.CACHED_USERS)
  async initRankCaching(payload: number[]) {
    try {
      const warmingPromises = payload.map((userId) =>
        this.updateRedisRankings(userId),
      );
      await Promise.all(warmingPromises);
      this.logger.log(`랭킹 레디스 초기 캐싱 완료`);
    } catch (error) {
      this.logger.error('랭킹 레디스 초기 캐싱 실패', error.stack);
      throw new InternalServerErrorException('랭킹 레디스 초기 캐싱 실패');
    }
  }

  /** @description rank entity에 저장 */
  async initialSave(watchedGame: Omit<CreateRankDto, 'status'>) {
    const { team_id, user_id, year } = watchedGame;

    await this.rankRepository.insert({
      team_id,
      active_year: year,
      user: { id: user_id },
    });
  }

  /** @description rank entity에 업데이트 */
  async updateRankEntity(watchedGame: CreateRankDto, isAdd: boolean) {
    const { status, team_id, user_id, year } = watchedGame;

    const columnToUpdate = {
      Win: 'win',
      Lose: 'lose',
      Tie: 'tie',
      'No game': 'cancel',
    };

    if (isAdd) {
      // 생성하거나 추가한 경우
      const updateCount = await this.rankRepository.increment(
        { team_id, user: { id: user_id }, active_year: year },
        columnToUpdate[status],
        1,
      );

      if (updateCount.affected === 0) {
        const rankData = new Rank();
        rankData.team_id = team_id;
        rankData.user = { id: user_id } as User;
        rankData.active_year = year;
        rankData[columnToUpdate[status]] = 1;
        await this.rankRepository.insert(rankData);
      }
    } else {
      // 삭제한 경우
      await this.rankRepository.decrement(
        { team_id, user: { id: user_id }, active_year: year },
        columnToUpdate[status],
        1,
      );
    }
  }

  /** @description 랭킹 상위 3명 가져오기 */
  async getTopThreeRankList(teamId?: number) {
    const key = teamId ? teamId : 'total';
    const rankList = await this.redisCachingService.getRankingList(key, 0, 2);

    return this.processRankList(rankList);
  }
  /** @description 랭킹 리스트에서 유저와 근처 유저 1명씩 가져오기 */
  async getUserRankWithNeighbors(user: User, teamId?: number) {
    const { id: userId } = user;
    const key = teamId ? teamId : 'total';
    const userRank = await this.redisCachingService.getUserRank(userId, key);
    if (userRank === null) {
      return [];
    }
    const start = Math.max(userRank - 1, 0);
    const end = userRank + 1;
    const rankList = await this.redisCachingService.getRankingList(
      key,
      start,
      end,
    );
    const searchRank = [];
    for (let i = 0; i < rankList.length; i += 2) {
      const result = await this.redisCachingService.getUserRank(
        parseInt(rankList[i]),
        key,
      );
      // 순위 1등은 0으로 들어옴
      searchRank.push(result + 1);
    }
    const calculated = await this.processRankList(rankList);

    return calculated.map((data, i) => {
      data.rank = searchRank[i];

      return data;
    });
  }

  /** @description 랭킹 리스트 전부, teamId가 들어오면 해당 팀의 랭킹 리스트 전부 */
  async getRankList(teamId?: number) {
    const key = teamId ? teamId : 'total';

    const rankList = await this.redisCachingService.getRankingList(key, 0, -1);

    return this.processRankList(rankList);
  }

  /** @description 레디스 랭킹과 유저 정보 데이터 합쳐서 가공 */
  private async processRankList(rankList: string[]) {
    const userInfoHashmap = await this.redisCachingService.getUserInfo();

    const rankData = [];
    for (let index = 0; index < rankList.length; index += 2) {
      const user_id = parseInt(rankList[index]);
      const score = parseInt(rankList[index + 1]);
      const { id, ...rest } = userInfoHashmap[user_id];
      const rank = index / 2 + 1;
      rankData.push({ rank, score, ...rest, user_id });
    }
    return rankData;
  }

  /** @description 랭킹 점수 레디스에 반영 */
  async updateRedisRankings(userId: number) {
    const stat = await this.calculateUserRankings(userId);

    for (const [key, value] of Object.entries(stat)) {
      const scoreString = this.calculateScore(value).toString();

      await this.redisCachingService.updateRankingScoreByUserId(
        userId,
        scoreString,
        key,
      );
    }
  }

  /** @description 해당 유저의 랭킹 전체 & 팀별 점수 계산 */
  private async calculateUserRankings(userId: number) {
    const thisYear = moment().year();
    const foundUserStats = await this.rankRepository.find({
      where: { user: { id: userId }, active_year: thisYear },
    });
    if (!foundUserStats) return {};

    const data: {
      string?: {
        win: number;
        lose: number;
        tie: number;
        cancel: number;
        score: number;
      };
    } = {};
    const totals = { win: 0, lose: 0, tie: 0, cancel: 0 };

    for (const stat of foundUserStats) {
      const { id, team_id, active_year, ...rest } = stat;

      const score = this.calculateScore(rest);
      // 서포트 팀 아이디가 key 값
      data[team_id] = { ...rest, score };
      totals.win += rest.win || 0;
      totals.lose += rest.lose || 0;
      totals.tie += rest.tie || 0;
      totals.cancel += rest.cancel || 0;
    }
    const totalScore = this.calculateScore(totals);
    data['total'] = { ...totals, score: totalScore };

    return data;
  }

  /** @description 유저의 직관 경기 전체 기록 */
  async userOverallGameStats(userId: number) {
    try {
      const userRecord = await this.rankRepository.find({
        where: { user: { id: userId } },
      });

      const sum = userRecord.reduce(
        (acc, cur) => {
          return {
            win: acc.win + cur.win,
            lose: acc.lose + cur.lose,
            tie: acc.tie + cur.tie,
            cancel: acc.cancel + cur.cancel,
            total: acc.total + cur.win + cur.lose + cur.tie + cur.cancel,
          };
        },
        { win: 0, lose: 0, tie: 0, cancel: 0, total: 0 },
      );
      const score = Math.floor(this.calculateScore(sum));
      return { ...sum, score };
    } catch (error) {
      throw new InternalServerErrorException('Rank Entity DB 조회 실패');
    }
  }

  /** @description 직관 홈 승리 & 상대팀 전적 불러오기 */
  async userStatsWithVerseTeam(userId: number) {
    const registeredGame: {
      win_id: number;
      home_id: number;
      away_id: number;
      sup_id: number;
      status: TRegisteredGameStatus;
    }[] = await this.registeredGameRepository
      .createQueryBuilder('registered_game')
      .innerJoin('registered_game.game', 'game')
      .select([
        'game.winning_team as win_id',
        'game.home_team_id as home_id',
        'game.away_team_id as away_id',
        'registered_game.status status',
        'registered_game.cheering_team.id as sup_id',
      ])
      .where('registered_game.user.id = :id', { id: userId })
      .getRawMany();

    let homeWin = 0;
    let totalWin = 0;
    const oppTeam = {};
    for (const game of registeredGame) {
      const { away_id, home_id, sup_id, status } = game;
      const isHomeGame = home_id === sup_id;
      const opp_id = home_id === sup_id ? away_id : home_id;
      if (status === 'No game') {
        continue;
      }
      if (status === 'Tie') {
        oppTeam[opp_id]
          ? oppTeam[opp_id].total++
          : (oppTeam[opp_id] = { total: 1, win: 0 });
        continue;
      }
      if (status === 'Win') {
        isHomeGame ? homeWin++ : null;
        totalWin++;
        oppTeam[opp_id]
          ? (oppTeam[opp_id].total++, oppTeam[opp_id].win++)
          : (oppTeam[opp_id] = { total: 1, win: 1 });
        continue;
      }
      oppTeam[opp_id]
        ? oppTeam[opp_id].total++
        : (oppTeam[opp_id] = { total: 1, win: 0 });
    }

    return { totalWin, homeWin, oppTeam };
  }

  private calculateScore({
    win = 0,
    lose = 0,
    tie = 0,
    cancel = 0,
  }: {
    win?: number;
    lose?: number;
    tie?: number;
    cancel?: number;
  }): number {
    const score = 1000 + (win - lose) * 10 + (win + lose + tie + cancel) / 1000;
    return score;
  }
}
