import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class RankService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    @InjectRepository(Rank)
    private readonly rankRepository: Repository<Rank>,
  ) {}

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

  /** @description 당일이 아닌 이전 직관 경기는 이벤트 리스터로 받아서 랭크 테이블 업데이트 후 랭킹 점수에 반영 */
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
    const foundRankData = await this.rankRepository.findOne({
      where: {
        team_id,
        user: { id: user_id },
        active_year: thisYear,
      },
    });

    if (!foundRankData) {
      const rankData = new Rank();
      rankData.team_id = team_id;
      rankData.user = { id: user_id } as User;
      rankData.active_year = thisYear;
      rankData[columnToUpdate[status]] = 1;
      await this.rankRepository.save(rankData);
    } else {
      foundRankData[columnToUpdate[status]] += 1;
      await this.rankRepository.save(foundRankData);
    }
  }

  /** @description 랭킹 상위 3명 가져오기 */
  async getTopThreeRankList(teamId?: number) {
    const key = teamId ? teamId : 'total';
    const rankList = await this.redisClient.zrevrange(
      `rank:${key}`,
      0,
      2,
      'WITHSCORES',
    );

    return this.processRankList(rankList);
  }
  /** @description 랭킹 리스트에서 유저와 근처 유저 1명씩 가져오기 */
  async getUserRankWithNeighbors(userId: number, teamId?: number) {
    const key = teamId ? teamId : 'total';
    const userRank = await this.redisClient.zrank(
      `rank:${key}`,
      userId.toString(),
    );
    if (!userRank) {
      throw new BadRequestException('해당 유저가 랭킹 리스트에 없습니다');
    }
    const start = Math.max(userRank - 1, 0);
    const end = userRank + 1;
    const rankList = await this.redisClient.zrevrange(
      `rank:${key}`,
      start,
      end,
      'WITHSCORES',
    );

    return this.processRankList(rankList);
  }

  /** @description 랭킹 리스트 전부, teamId가 들어오면 해당 팀의 랭킹 리스트 전부 */
  async getRankList(teamId?: number) {
    const key = teamId ? teamId : 'total';
    const rankList = await this.redisClient.zrevrange(
      `rank:${key}`,
      0,
      -1,
      'WITHSCORES',
    );

    return this.processRankList(rankList);
  }

  /** @description 레디스 랭킹과 유저 정보 데이터 합쳐서 가공 */
  private async processRankList(rankList: string[]) {
    const rawUserInfo = await this.redisClient.hgetall('userInfo');
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
        `rank:${key}`,
        value.score.toString(),
        userId.toString(),
      );
    }
  }

  /** @description 해당 유저의 랭킹 전체 & 팀별 점수 계산 */
  async calculateUserRankings(userId: number) {
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

  async saveTest() {}

  async getTest() {}

  async delTest() {}
}
