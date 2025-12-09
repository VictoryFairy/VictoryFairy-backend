import { Injectable, Logger } from '@nestjs/common';
import { GameScheduleCrawlingService } from '../infra/crawling/game-schedule.crawling.service';
import { GameScoreCrawlingService } from '../infra/crawling/game-score.crawling.service';
import { DataSource, IsNull } from 'typeorm';
import * as moment from 'moment-timezone';
import { getNextMonth } from 'src/common/utils/get-next-month.util';
import { Game } from '../core/domain/game.entity';
import { IGameData } from 'src/modules/scheduling/crawling-game.type';
import { Team } from 'src/modules/team/entities/team.entity';
import { Stadium } from 'src/modules/stadium/entities/stadium.entity';
import { TeamService } from 'src/modules/team/team.service';
import { StadiumService } from 'src/modules/stadium/stadium.service';
import { SCHEDULER_NAME } from 'src/modules/scheduling/type/schedule-job-name.type';
import { CronJob } from 'cron';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { IDotenv } from 'src/config/dotenv.interface';
import { GameCoreService } from '../core/game-core.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { RegisteredGameCoreService } from 'src/modules/registered-game/core/registered-game-core.service';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';

@Injectable()
export class GameApplicationCrawlingService {
  private readonly logger = new Logger(GameApplicationCrawlingService.name);

  constructor(
    private readonly gameScheduleCrawlingService: GameScheduleCrawlingService,
    private readonly gameScoreCrawlingService: GameScoreCrawlingService,
    private readonly gameCoreService: GameCoreService,
    private readonly registeredGameCoreService: RegisteredGameCoreService,
    private readonly rankCoreService: RankCoreService,
    private readonly rankRedisService: RankingRedisService,
    private readonly dataSource: DataSource,
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService<IDotenv>,
  ) {}

  /**
   * 시드 데이터 크롤링 작성
   */
  async crawlSeedGameData(dateInfo: {
    year: number;
    month: number;
  }): Promise<void> {
    try {
      const { year, month } = dateInfo;
      const crawlResult =
        await this.gameScheduleCrawlingService.crawlGameSchedule({
          year,
          month,
        });
      await this.saveGamesFromCrawling(crawlResult);
    } catch (error) {
      this.logger.error('Error in crawlSeedGameData', error.stack);
      throw error;
    }
  }

  /**
   * 이번달과 다음달 경기 데이터를 크롤링하고 DB에 저장.
   * @param date 기준 날짜 (YYYY-MM-DD 형식)
   */
  async getThisAndNextMonthGameData(date: string): Promise<void> {
    try {
      const fullDate = date.split('-').map(Number);
      const [currentYear, currentMonth] = [fullDate[0], fullDate[1]];
      const { nextYear, nextMonth } = getNextMonth(currentYear, currentMonth);

      // 현재 달 데이터 가져오기
      const currentMonthGames =
        await this.gameScheduleCrawlingService.crawlGameSchedule({
          year: currentYear,
          month: currentMonth,
        });
      await this.saveGamesFromCrawling(currentMonthGames);

      // 다음 달 데이터 가져오기
      const nextMonthGames =
        await this.gameScheduleCrawlingService.crawlGameSchedule({
          year: nextYear,
          month: nextMonth,
        });
      await this.saveGamesFromCrawling(nextMonthGames);
    } catch (error) {
      this.logger.error('Error in getThisAndNextMonthGameData', error.stack);
      throw error;
    }
  }

  /**
   * 크롤링한 게임 데이터를 데이터베이스에 저장합니다.
   * @param games 크롤링한 게임 데이터 배열
   */
  private async saveGamesFromCrawling(games: IGameData[]): Promise<void> {
    if (!games || games.length === 0) {
      this.logger.log('No games to save');
      return;
    }

    this.logger.log(`Saving ${games.length} games to database`);
    try {
      // DataSource를 사용하여 트랜잭션으로 게임 데이터 저장
      await this.dataSource.manager.transaction(async (manager) => {
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
            homeTeam = await this.teamService.save(gameData.homeTeam, manager);
            teamMaps.set(gameData.homeTeam, homeTeam);
          }
          if (!awayTeam) {
            awayTeam = await this.teamService.save(gameData.awayTeam, manager);
            teamMaps.set(gameData.awayTeam, awayTeam);
          }
          if (!stadium) {
            stadium = await this.stadiumService.save(gameData.stadium, manager);
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
            this.logger.error('Error saving game:', error);
            throw error;
          }
        }
      });
    } catch (error) {
      this.logger.error('Error saving games to database', error.stack);
      throw error;
    }
  }

  /**
   * @description
   * 점수 크롤링 트리거 크론잡 설정 -> 1분 간격 점수 크롤링 크론잡을 가져와 실행
   **/
  async setupTriggerForGameScoreCrawlingJob(games: Game[]): Promise<void> {
    for (const game of games) {
      const [hour, minute, second] = game.time?.split(':').map(Number);
      const [year, month, day] = game.date?.split('-').map(Number);
      const tzDate = {
        year,
        month: month - 1,
        day,
        hour,
        minute,
        second,
      };

      // 기존 중복된 trigger 크론잡 있으면 삭제
      this.deleteExistingCronJob(`${SCHEDULER_NAME.GAME_TRIGGER}-${game.id}`);

      const triggerTime = moment.tz(tzDate, 'Asia/Seoul').toDate(); // 2025-05-22T09:30:00.000Z
      const now = moment().tz('Asia/Seoul').toDate();
      // 현재 시간이 트리거 시간보다 이전이면 바로 시작
      if (triggerTime < now) {
        this.logger.log(
          `Trigger time already passed for game ${game.id}, starting score job immediately.`,
        );
        await this.handleGameTriggerJob(game); // 바로 시작
      } else {
        const triggerForGameScore = new CronJob(
          triggerTime,
          async () => {
            await this.handleGameTriggerJob(game);
            // 트리거 실행 완료 후 해당 트리거 크론잡 삭제
            const triggerJobName = `${SCHEDULER_NAME.GAME_TRIGGER}-${game.id}`;
            this.deleteExistingCronJob(triggerJobName);
          },
          null,
          false,
          'Asia/Seoul',
        );
        this.schedulerRegistry.addCronJob(
          `${SCHEDULER_NAME.GAME_TRIGGER}-${game.id}`,
          triggerForGameScore,
        );

        triggerForGameScore.start();
      }
    }
  }

  /**
   * @description
   * 게임 트리거 크론잡이 수행할 일 : 1분마다 게임 점수 크롤링 작업을 생성하고 등록
   */
  private async handleGameTriggerJob(game: Game): Promise<void> {
    // 기존 중복된 update-game-score 크론잡 있으면 삭제
    this.deleteExistingCronJob(
      `${SCHEDULER_NAME.UPDATE_GAME_SCORE}-${game.id}`,
    );
    const gameJob = await this.createGameScoreJobForOneMinute(game.id);
    this.schedulerRegistry.addCronJob(
      `${SCHEDULER_NAME.UPDATE_GAME_SCORE}-${game.id}`,
      gameJob,
    );
    gameJob.start();
  }

  /**
   * @description
   * 점수 크롤링을 1분마다 실행할 크론잡 생성
   * @return
   * CronJob
   **/
  private async createGameScoreJobForOneMinute(
    gameId: string,
  ): Promise<CronJob> {
    const seriesId = this.configService.get('SERIES_ID', {
      infer: true,
    });
    const intervalJob = new CronJob(
      CronExpression.EVERY_MINUTE,
      async () => {
        const currentStatus =
          await this.gameScoreCrawlingService.getCurrentGameStatus(
            1,
            seriesId,
            gameId,
            new Date().getFullYear(),
          );
        await this.gameCoreService.updateInProgressGame(gameId, currentStatus);
        if (
          currentStatus.status === '경기종료' ||
          /.*취소$/.test(currentStatus.status)
        ) {
          const isCanceled = /.*취소$/.test(currentStatus.status);
          this.logger.log(
            `Game ${gameId} ended. Stopping updates. ${isCanceled ? 'Canceled' : 'Ended'}`,
          );
          const jobName = `${SCHEDULER_NAME.UPDATE_GAME_SCORE}-${gameId}`;
          try {
            intervalJob.stop();
            await this.gameCoreService.updateFinishedMatch(
              gameId,
              currentStatus,
            );
            // 완료 시 경기결과 나오기전 직관 등록 데이터들 업데이트 및 랭킹 업데이트
            await this.batchBulkGameResultUpdateByGameId(gameId);
          } catch (error) {
            throw error;
          } finally {
            // 멈춘 크론잡 삭제
            this.deleteExistingCronJob(jobName);
          }
          return;
        }
      },
      null,
      true,
      'Asia/Seoul',
    );
    return intervalJob;
  }

  /**
   * @description
   * 기존 크론잡 삭제
   * @param jobName string
   **/
  private deleteExistingCronJob(jobName: string) {
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.logger.log(`${jobName} already exists. Deleting...`);
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  @Transactional()
  private async batchBulkGameResultUpdateByGameId(
    gameId: string,
  ): Promise<void> {
    try {
      const game = await this.gameCoreService.getOneWithTeams(gameId);
      const registeredGames = await this.registeredGameCoreService.getByGameId(
        gameId,
        { status: IsNull() },
      );
      if (!registeredGames.length) {
        this.logger.log(
          `당일 경기:${gameId}을 경기 중에 등록한 유저 없음. 스킵`,
        );
        return;
      }

      const registeredGameUpdates = [];
      for (const registeredGame of registeredGames) {
        const team_id = registeredGame.cheering_team.id;
        registeredGame.determineStatus(game.status, team_id);
        registeredGameUpdates.push({
          registeredGame,
        });
      }
      // 직관 경기 결과 업데이트
      const savedRegisteredGames =
        await this.registeredGameCoreService.saveBulk(registeredGameUpdates);
      runOnTransactionCommit(async () => {
        savedRegisteredGames.forEach(async (registeredGame) => {
          const userId = registeredGame.user.id;
          // Rank 업데이트
          const data =
            await this.rankCoreService.aggregateRankStatsByUserId(userId);
          await this.rankRedisService.updateRankings(userId, data);
        });
      });

      this.logger.log(`당일 경기:${gameId} 상태 업데이트 후 트랜잭션 성공`);
    } catch (error) {
      this.logger.error(
        `당일 경기:${gameId} 상태 업데이트 후 트랜잭션 실패`,
        error.stack,
      );
    }
  }
}
