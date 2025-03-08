import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rank } from 'src/entities/rank.entity';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateRankDto, UserRecordDto } from 'src/dtos/rank.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';
import { RankingRedisService } from './ranking-redis.service';
import { IRefinedRankData } from 'src/types/rank.type';
import { UserRedisService } from './user-redis.service';

@Injectable()
export class RankService {
  private readonly logger = new Logger(RankService.name);
  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    @InjectRepository(Rank)
    private readonly rankRepository: Repository<Rank>,
    private readonly rankingRedisService: RankingRedisService,
    private readonly userRedisService: UserRedisService,
  ) {}

  /** 레디스 연결 시 랭킹 데이터 미리 저장 */
  @OnEvent(EventName.CACHED_USERS)
  async initRankCaching(userIdsArr: number[]): Promise<void> {
    if (!userIdsArr.length) {
      this.logger.log('빈 페이로드로 랭킹 레디스 초기 캐싱 스킵');
      return;
    }
    try {
      const warmingPromises = userIdsArr.map((userId) =>
        this.updateRedisRankings(userId),
      );
      await Promise.all(warmingPromises);
      this.logger.log(`랭킹 레디스 초기 캐싱 완료`);
    } catch (error) {
      this.logger.error('랭킹 레디스 초기 캐싱 실패', error.stack);
      throw new InternalServerErrorException('랭킹 레디스 초기 캐싱 실패');
    }
  }

  /** @description rank entity에 없으면 저장*/
  async insertRankIfAbsent(
    watchedGame: Omit<CreateRankDto, 'status'>,
  ): Promise<void> {
    const { team_id, user_id, year } = watchedGame;

    const foundRankData = await this.rankRepository.exists({
      where: { user: { id: user_id }, active_year: year, team_id },
    });

    if (!foundRankData) {
      await this.rankRepository.insert({
        team_id,
        active_year: year,
        user: { id: user_id },
      });
    }
  }

  /** @description rank entity에 업데이트
   * @param isAdd 직관 경기 추가 / 제거에 대한 플래그
   */
  async updateRankEntity(
    watchedGame: CreateRankDto,
    isAdd: boolean,
  ): Promise<void> {
    const { status, team_id, user_id, year } = watchedGame;

    const columnToUpdate = {
      Win: 'win',
      Lose: 'lose',
      Tie: 'tie',
      'No game': 'cancel',
    };

    const foundRankData = await this.rankRepository.findOne({
      where: { user: { id: user_id }, active_year: year, team_id },
    });

    // 직관 경기 등록한 경우
    if (isAdd) {
      if (!foundRankData) {
        const rankData = new Rank();
        rankData.team_id = team_id;
        rankData.user = { id: user_id } as User;
        rankData.active_year = year;
        rankData[columnToUpdate[status]] = 1;
        await this.rankRepository.insert(rankData);
      } else {
        //테이블에 해당 팀과 유저의 조합으로 데이터가 없다면 추가
        await this.rankRepository.increment(
          { team_id, user: { id: user_id }, active_year: year },
          columnToUpdate[status],
          1,
        );
      }
    } else {
      // 직관 경기 삭제한 경우
      // 테이블에 기존 데이터가 있는 경우만 감소
      if (foundRankData) {
        await this.rankRepository.decrement(
          { team_id, user: { id: user_id }, active_year: year },
          columnToUpdate[status],
          1,
        );
      }
    }
  }

  /** @description 랭킹 리스트에서 유저와 근처 유저 1명씩 가져오기 */
  async getUserRankWithNeighbors(
    user: User,
    teamId?: number,
  ): Promise<IRefinedRankData[]> {
    const { id: userId } = user;
    const userRank = await this.rankingRedisService.getUserRank(userId, teamId);
    if (userRank === null) {
      return [];
    }
    const start = Math.max(userRank - 1, 0);
    const end = userRank + 1;
    const refinedRankData = await this.getRankList(start, end, teamId);
    const searchRank = [];
    for (let i = 0; i < refinedRankData.length; i++) {
      const result = await this.rankingRedisService.getUserRank(
        refinedRankData[i].user_id,
        teamId,
      );
      searchRank.push(result + 1); // 순위 1등은 0으로 들어 옴
    }

    const result = refinedRankData.map((data, i) => {
      data.rank = searchRank[i];
      return data;
    });
    return result;
  }

  /**
   * @description 랭킹 리스트 가져오기
   * @param start 랭킹 리스트의 시작 인덱스(첫 번쨰 인덱스는 0)
   * @param end 랭킹 리스트의 끝 인덱스(끝까지 가져오려면 -1)
   * @param teamId 선택적 팀 ID. 없으면 'total'로 처리
   */
  async getRankList(
    start: number,
    end: number,
    teamId?: number,
  ): Promise<IRefinedRankData[]> {
    if (end !== -1 && start > end)
      throw new BadRequestException('잘못된 랭킹 리스트 요청');
    const key = teamId ? teamId : 'total';

    const rankList = await this.rankingRedisService.getRankingList(
      key,
      start,
      end,
    );

    const refinedRankData = await this.refineRankData(rankList);
    return refinedRankData;
  }

  /** @description 레디스 랭킹과 유저 정보 데이터 합쳐서 가공 */
  private async refineRankData(
    rankList: string[],
  ): Promise<IRefinedRankData[]> {
    const userInfoHashmap = await this.userRedisService.getUserInfo();

    const rankData = [];
    for (let i = 0; i < rankList.length; i += 2) {
      const userId = parseInt(rankList[i]);
      const score = parseInt(rankList[i + 1]);
      const userInfo = userInfoHashmap[userId];
      if (!userInfo) continue;

      rankData.push({
        user_id: userId,
        nickname: userInfo.nickname,
        profile_image: userInfo.profile_image,
        score,
      });
    }
    return rankData;
  }

  /** @description 랭킹 점수 레디스에 반영 */
  async updateRedisRankings(userId: number): Promise<void> {
    const stat = await this.calculateUserRankings(userId);

    for (const [key, value] of Object.entries(stat)) {
      const scoreString = this.calculateScore(value).toString();

      await this.rankingRedisService.updateRankingScoreByUserId(
        userId,
        scoreString,
        key,
      );
    }
  }

  /** @description 해당 유저의 랭킹 전체 & 팀별 점수 계산 */
  private async calculateUserRankings(
    userId: number,
  ): Promise<Record<string, Omit<UserRecordDto, 'total'>> | undefined> {
    const foundUserStats = await this.rankRepository.find({
      where: { user: { id: userId } },
    });
    if (!foundUserStats) return {};

    const data: Record<string, Omit<UserRecordDto, 'total'>> | undefined = {};
    const totals = { win: 0, lose: 0, tie: 0, cancel: 0 };

    for (const stat of foundUserStats) {
      const { id, team_id, ...rest } = stat;

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
  async userOverallGameStats(userId: number): Promise<UserRecordDto> {
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
    try {
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
    } catch (error) {
      throw new InternalServerErrorException('데이터 조회 중 문제가 발생');
    }
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
