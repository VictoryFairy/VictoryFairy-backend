import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { CreateRankDto, EventCreateRankDto } from 'src/dtos/rank.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { RedisKeys } from 'src/const/redis.const';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';

@Injectable()
export class RankService {
  private readonly logger = new Logger(RankService.name);
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    @InjectRepository(Rank)
    private readonly rankRepository: Repository<Rank>,
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

  /** @description 당일 직관 등록 경기 오후 11시 기준으로 업데이트하기 */
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async rankTodayUpdate() {
    const todayKST = moment.tz('Asia/Seoul').startOf('day');
    const tomorrowKST = moment(todayKST).add(1, 'day');

    const todayUTC = todayKST.clone().utc().toISOString();
    const tomorrowUTC = tomorrowKST.clone().utc().toISOString();

    const thisYear = todayKST.year();

    const todayRegisterGame = await this.registeredGameRepository
      .createQueryBuilder('registered_game')
      .innerJoin('registered_game.game', 'game')
      .innerJoin('registered_game.cheering_team', 'team')
      .innerJoin('registered_game.user', 'user')
      .where('game.date >= :today AND game.date < :tomorrow', {
        today: todayUTC,
        tomorrow: tomorrowUTC,
      })
      .select([
        'registered_game.status AS status',
        'team.id AS team_id',
        'user.id AS user_id',
      ])
      .getRawMany();

    for (const watched of todayRegisterGame) {
      await this.updateRankEntity({ ...watched, thisYear });
      await this.updateRedisRankings(watched.user_id);
    }
  }

  /** @description 당일이 아닌 이전 직관 경기는 이벤트 리스너로 받아서 랭크 테이블 업데이트 후 랭킹 점수에 반영 */
  @OnEvent('registeredGame.oldGame')
  async handleCreateOldGame(payload: EventCreateRankDto) {
    const thisYear = moment().year();
    await this.updateRankEntity({ ...payload, thisYear });
    await this.updateRedisRankings(payload.user_id);
  }

  /** @description rank entity에 저장 */
  async updateRankEntity(watchedGame: CreateRankDto) {
    const { status, team_id, user_id, thisYear } = watchedGame;

    const columnToUpdate = {
      Win: 'win',
      Lose: 'lose',
      Tie: 'tie',
      'No game': 'cancel',
    };

    const updateCount = await this.rankRepository.increment(
      { team_id, user: { id: user_id }, active_year: thisYear },
      columnToUpdate[status],
      1,
    );

    if (updateCount.affected === 0) {
      const rankData = new Rank();
      rankData.team_id = team_id;
      rankData.user = { id: user_id } as User;
      rankData.active_year = thisYear;
      rankData[columnToUpdate[status]] = 1;
      await this.rankRepository.insert(rankData);
    }
  }

  /** @description 랭킹 상위 3명 가져오기 */
  async getTopThreeRankList(teamId?: number) {
    const key = teamId ? teamId : 'total';
    const rankList = await this.redisClient.zrevrange(
      `${RedisKeys.RANKING}:${key}`,
      0,
      2,
      'WITHSCORES',
    );
    if (!rankList.length) {
      throw new NotFoundException('랭킹 리스트 없음');
    }

    return this.processRankList(rankList);
  }
  /** @description 랭킹 리스트에서 유저와 근처 유저 1명씩 가져오기 */
  async getUserRankWithNeighbors(userId: number, teamId?: number) {
    const key = teamId ? teamId : 'total';
    const userRank = await this.redisClient.zrevrank(
      `${RedisKeys.RANKING}:${key}`,
      userId.toString(),
    );
    if (userRank === null) {
      throw new NotFoundException('해당 유저가 랭킹 리스트에 없습니다');
    }
    const start = Math.max(userRank - 1, 0);
    const end = userRank + 1;
    const rankList = await this.redisClient.zrevrange(
      `${RedisKeys.RANKING}:${key}`,
      start,
      end,
      'WITHSCORES',
    );
    const searchRank = [];
    for (let i = 0; i < rankList.length; i += 2) {
      const result = await this.redisClient.zrevrank(
        `${RedisKeys.RANKING}:${key}`,
        rankList[i],
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
    const rankList = await this.redisClient.zrevrange(
      `${RedisKeys.RANKING}:${key}`,
      0,
      -1,
      'WITHSCORES',
    );

    if (!rankList.length) {
      throw new NotFoundException('랭킹 리스트 없음');
    }

    return this.processRankList(rankList);
  }

  /** @description 레디스 랭킹과 유저 정보 데이터 합쳐서 가공 */
  private async processRankList(rankList: string[]) {
    const rawUserInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
    const parsedInfo = {};
    Object.values(rawUserInfo).forEach((user) => {
      const obj = JSON.parse(user);
      parsedInfo[obj.id] = obj;
    });

    const rankData = [];
    for (let index = 0; index < rankList.length; index += 2) {
      const user_id = parseInt(rankList[index]);
      const score = parseInt(rankList[index + 1]);
      const { id, ...rest } = parsedInfo[user_id];
      const rank = index / 2 + 1;
      rankData.push({ rank, score, ...rest, user_id });
    }
    return rankData;
  }

  /** @description 랭킹 점수 레디스에 반영 */
  async updateRedisRankings(userId: number) {
    const stat = await this.calculateUserRankings(userId);

    for (const [key, value] of Object.entries(stat)) {
      await this.redisClient.zadd(
        `${RedisKeys.RANKING}:${key}`,
        value.score.toString(),
        userId.toString(),
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

      const score = 1000 + (rest.win || 0) * 5 - (rest.lose || 0) * 5;
      // 서포트 팀 아이디가 key 값
      data[team_id] = { ...rest, score };
      totals.win += rest.win || 0;
      totals.lose += rest.lose || 0;
      totals.tie += rest.tie || 0;
      totals.cancel += rest.cancel || 0;
    }
    const totalScore = 1000 + (totals.win - totals.lose) * 5;
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
      return sum;
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
}
