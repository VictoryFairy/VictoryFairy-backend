import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rank } from '../entities/rank.entity';
import { InsertRankDto } from '../dto/internal/insert-rank.dto';
import { RankingRedisService } from 'src/core/redis/ranking-redis.service';
import { RankScoreVo } from './domain/vo/rank-score.vo';

@Injectable()
export class RankCoreService {
  constructor(
    @InjectRepository(Rank)
    private readonly rankRepo: Repository<Rank>,
    private readonly rankingRedisService: RankingRedisService,
  ) {}

  async insertRankIfAbsent(dto: InsertRankDto): Promise<void> {
    const { team_id, user_id, active_year } = dto;
    const foundRankData = await this.rankRepo.findOne({
      where: { user: { id: user_id }, active_year, team_id },
    });

    if (!foundRankData) {
      const createRank = Rank.create({
        teamId: team_id,
        userId: user_id,
        activeYear: active_year,
      });
      await this.rankRepo.save(createRank);
      return;
    }
    return;
  }

  async aggregateRankStatsByUserId(
    userId: number,
  ): Promise<Record<string, RankScoreVo>> {
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

    const totalVo = RankScoreVo.from({ win: 0, lose: 0, tie: 0, cancel: 0 });
    const teamVoMap: Record<string, RankScoreVo> = {};
    rawRanks.forEach(({ team_id, win, lose, tie, cancel }) => {
      const vo = RankScoreVo.from({
        win: Number(win),
        lose: Number(lose),
        tie: Number(tie),
        cancel: Number(cancel),
      });
      totalVo.add(vo);
      teamVoMap[team_id.toString()] = vo;
    });
    const data = { ...teamVoMap, total: totalVo };

    return data;
    // await this.rankingRedisService.updateRankings(userId, data);
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
  ): Promise<{ rank: number; userId: number; score: number }[]> {
    const rankList = await this.rankingRedisService.getRankingList(
      teamId,
      start,
      end,
    );
    const refinedRankData = [];
    for (let i = 0; i < rankList.length; i += 2) {
      const userId = Number(rankList[i]);
      const score = RankScoreVo.toDisplayScore(rankList[i + 1]);
      const rank = start + 1 + Math.floor(i / 2);
      refinedRankData.push({ rank, userId, score });
    }
    return refinedRankData;
  }
}
