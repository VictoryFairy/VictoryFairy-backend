import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Rank } from './domain/rank.entity';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { RankScoreVo } from './domain/vo/rank-score.vo';
import { GameResultColumnMap } from './types/game-result-column-map.type';
import { RegisteredGameStatus } from 'src/modules/registered-game/core/types/registered-game-status.type';
import { OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/shared/const/event.const';
import { RankRecordNotFoundError } from './domain/error/rank.error';
import {
  InsertRankInput,
  RefinedRankData,
  AggregatedRankStats,
} from './types/rank.interface';

@Injectable()
export class RankCoreService {
  private readonly logger = new Logger(RankCoreService.name);
  constructor(
    @InjectRepository(Rank)
    private readonly rankRepo: Repository<Rank>,
    private readonly rankingRedisService: RankingRedisService,
  ) {}

  /** 레디스 연결 시 랭킹 데이터 미리 저장 */
  @OnEvent(EventName.CACHED_USERS)
  async initRankCaching(userIdsArr: number[]): Promise<void> {
    if (userIdsArr.length === 0) {
      this.logger.log('빈 페이로드로 랭킹 레디스 초기 캐싱 스킵');
      return;
    }
    const promises = userIdsArr.map(async (userId) => {
      const data = await this.aggregateRankStatsByUserId(userId);
      if (!data) return;
      await this.rankingRedisService.updateRankings(userId, data);
    });

    await Promise.all(promises);
    this.logger.log(`랭킹 레디스 초기 캐싱 완료`);
  }

  async insertRankIfAbsent(input: InsertRankInput): Promise<void> {
    const { teamId, userId, activeYear } = input;
    const foundRankData = await this.rankRepo.findOne({
      where: { user: { id: userId }, active_year: activeYear, team_id: teamId },
    });

    if (foundRankData) return;
    const createRank = Rank.create({
      teamId,
      userId,
      activeYear,
    });
    await this.rankRepo.save(createRank);
    return;
  }

  async updateRankRecord(
    dto: {
      teamId: number;
      userId: number;
      activeYear: number;
      status: RegisteredGameStatus;
    },
    isAdd: boolean,
  ): Promise<void> {
    const { teamId, userId, activeYear, status } = dto;
    const column = GameResultColumnMap[status];
    let targetRankData = await this.rankRepo.findOne({
      where: { user: { id: userId }, active_year: activeYear, team_id: teamId },
    });

    if (!targetRankData) {
      if (!isAdd) {
        throw new RankRecordNotFoundError();
      }
      targetRankData = Rank.create({ teamId, userId, activeYear });
    }
    targetRankData.adjustRecord(column, isAdd);

    await this.rankRepo.save(targetRankData);
    return;
  }

  async deleteRank(
    teamId: number,
    userId: number,
    activeYear?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<Rank> = {
      user: { id: userId },
      team_id: teamId,
    };
    if (activeYear) {
      where.active_year = activeYear;
    }
    const rankData = await this.rankRepo.findOne({ where });
    if (!rankData) return;

    await this.rankRepo.remove(rankData);
  }

  async aggregateRankStatsByUserId(
    userId: number,
  ): Promise<AggregatedRankStats | undefined> {
    const rawRanks = await this.rankRepo
      .createQueryBuilder('rank')
      .select('rank.team_id', 'team_id')
      .addSelect('SUM(rank.win)', 'win')
      .addSelect('SUM(rank.lose)', 'lose')
      .addSelect('SUM(rank.tie)', 'tie')
      .addSelect('SUM(rank.cancel)', 'cancel')
      .where('rank.user_id = :userId', { userId })
      .groupBy('rank.team_id') // 연도 상관없이 팀별로 뭉침
      .getRawMany();

    if (!rawRanks.length) return;

    const tempVoArr: RankScoreVo[] = [];
    const teamVoMap: AggregatedRankStats = {} as AggregatedRankStats;
    rawRanks.forEach(({ team_id, win, lose, tie, cancel }) => {
      const vo = RankScoreVo.from({
        win: Number(win),
        lose: Number(lose),
        tie: Number(tie),
        cancel: Number(cancel),
      });
      tempVoArr.push(vo);
      teamVoMap[team_id.toString()] = vo;
    });
    teamVoMap['total'] = RankScoreVo.from({
      win: 0,
      lose: 0,
      tie: 0,
      cancel: 0,
    }).add(tempVoArr);

    return teamVoMap;
  }

  /**
   *
   * @param start 랭킹 리스트의 시작 인덱스(첫 번쨰 인덱스는 0)
   * @param end 랭킹 리스트의 끝 인덱스(끝까지 가져오려면 -1)
   * @param teamId 선택적 팀 ID. 없으면 'total'로 처리
   */
  async getRefinedRankDataFromRedis(
    start: number,
    end: number,
    teamId: number | 'total',
  ): Promise<RefinedRankData[]> {
    const rankList = await this.rankingRedisService.getRankingList(
      teamId,
      start,
      end,
    );
    const refinedRankData: RefinedRankData[] = [];
    for (let i = 0; i < rankList.length; i += 2) {
      const userId = Number(rankList[i]);
      const score = RankScoreVo.toDisplayScore(rankList[i + 1]);
      const rank = start + 1 + Math.floor(i / 2);
      refinedRankData.push({ rank, userId, score });
    }
    return refinedRankData;
  }
}
