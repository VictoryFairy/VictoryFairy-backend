import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';
import { Repository } from 'typeorm';

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

  /** 당일 직관 등록 경기 업데이트하기 */
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async rankTodayUpdate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayRegisterGame = await this.registeredGameRepository
      .createQueryBuilder('registered_game')
      .innerJoin('registered_game.game', 'game')
      .innerJoin('registered_game.cheering_team', 'team')
      .innerJoin('registered_game.user', 'user')
      .where('game.date >= :today AND game.date < :tomorrow', {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
      })
      .select([
        'registered_game.status AS status',
        'team.id AS team_id',
        'user.id AS user_id',
      ])
      .getRawMany();

    const updateTablePromises = todayRegisterGame.map((watched) => {
      return this.updateRankTable({ ...watched, thisYear });
    });

    await Promise.all(updateTablePromises);
  }

  async updateRankTable(watchedGame: {
    team_id: number;
    user_id: number;
    status: TRegisteredGameStatus;
    thisYear: number;
  }) {
    const columnToUpdate = {
      승: 'win',
      패: 'lose',
      무: 'tie',
      취: 'cancel',
    };
    const foundRankData = await this.rankRepository.findOne({
      where: {
        team_id: watchedGame.team_id,
        user: { id: watchedGame.user_id },
        active_year: watchedGame.thisYear,
      },
    });

    if (!foundRankData) {
      const rankData = new Rank();
      rankData.team_id = watchedGame.team_id;
      rankData.user = { id: watchedGame.user_id } as User;
      rankData.active_year = watchedGame.thisYear;
      rankData[columnToUpdate[watchedGame.status]] = 1;
      await this.rankRepository.save(rankData);
    } else {
      foundRankData[columnToUpdate[watchedGame.status]] += 1;
      await this.rankRepository.save(foundRankData);
    }
  }

  async saveTest() {}

  async getTest() {}

  async delTest() {}
}
