import { Injectable, Logger } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import * as moment from 'moment-timezone';
import { getNextMonth } from 'src/common/utils/get-next-month.util';
import { Game } from '../core/domain/game.entity';
import { SCHEDULER_NAME } from 'src/modules/game/application/const/scheduler-name.const';
import { CronJob } from 'cron';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { IDotenv } from 'src/config/dotenv.interface';
import { GameCoreService } from '../core/game-core.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { RegisteredGameCoreService } from 'src/modules/registered-game/core/registered-game-core.service';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { upsertSchedules } from 'src/modules/game/application/util/game-schedule.crawling.util';
import { getCurrentGameStatus } from 'src/modules/game/application/util/game-score.crawling.util';

@Injectable()
export class GameApplicationCrawlingService {
  private readonly logger = new Logger(GameApplicationCrawlingService.name);

  constructor(
    private readonly gameCoreService: GameCoreService,
    private readonly registeredGameCoreService: RegisteredGameCoreService,
    private readonly rankCoreService: RankCoreService,
    private readonly rankRedisService: RankingRedisService,
    private readonly dataSource: DataSource,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService<IDotenv>,
  ) {}

  /**
   * 이번달과 다음달 경기 데이터를 크롤링하고 DB에 저장.
   * @param date 기준 날짜 (YYYY-MM-DD 형식)
   */
  async getThisAndNextMonthGameData(date: string): Promise<void> {
    try {
      const fullDate = date.split('-').map(Number);
      const [currentYear, currentMonth] = [fullDate[0], fullDate[1]];
      const { nextYear, nextMonth } = getNextMonth(currentYear, currentMonth);

      // 현재 달 데이터 크롤링 및 저장
      await upsertSchedules({
        year: currentYear,
        month: currentMonth,
        em: this.dataSource.manager,
        logger: this.logger,
      });

      // 다음 달 데이터 크롤링 및 저장
      await upsertSchedules({
        year: nextYear,
        month: nextMonth,
        em: this.dataSource.manager,
        logger: this.logger,
      });
    } catch (error) {
      this.logger.error('Error in getThisAndNextMonthGameData', error.stack);
      throw error;
    }
  }

  /**
   * 날짜 기반으로 경기 목록을 조회합니다.
   * @param date 날짜 문자열 (YYYY-MM-DD 형식)
   * @returns 해당 날짜의 경기 목록
   */
  async findGamesByDate(date: string): Promise<Game[]> {
    return this.gameCoreService.findGamesByDate(date);
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
        const currentStatus = await getCurrentGameStatus(
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
