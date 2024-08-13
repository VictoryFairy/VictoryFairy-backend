import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { CreateRankDto } from 'src/dtos/rank.dto';

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

    const userList = [];
    for (const watched of todayRegisterGame) {
      userList.push(watched.user_id);
      await this.updateRankEntity({ ...watched, thisYear });
    }

    for (const list of userList) {
      await this.updateRedisRankings(list);
    }
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
