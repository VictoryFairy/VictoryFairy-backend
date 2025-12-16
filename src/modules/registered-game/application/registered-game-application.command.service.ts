import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RegisteredGameCoreService } from '../core/registered-game-core.service';
import { CreateRegisteredGameDto } from './dto/request/req-create-registered-game.dto';
import { UpdateRegisteredGameDto } from './dto/request/req-update-registered-game.dto';
import { RegisteredGameWithGameResponseDto } from './dto/response/res-registered-game-with-game.dto';
import { GameCoreService } from 'src/modules/game/core/game-core.service';
import { TeamCoreService } from 'src/modules/team/core/team-core.service';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { AwsS3Service } from 'src/infra/aws-s3/aws-s3.service';
import { SaveRegisteredGameInput } from '../core/types/registered-game.interface';

@Injectable()
export class RegisteredGameApplicationCommandService {
  constructor(
    private readonly registeredGameCoreService: RegisteredGameCoreService,
    private readonly gameCoreService: GameCoreService,
    private readonly teamCoreService: TeamCoreService,
    private readonly rankCoreService: RankCoreService,
    private readonly rankingRedisService: RankingRedisService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Transactional()
  async register(
    dto: CreateRegisteredGameDto,
    userId: number,
  ): Promise<RegisteredGameWithGameResponseDto> {
    const { gameId, cheeringTeamId, image, seat, review } = dto;
    const game = await this.gameCoreService.getOneWithTeamAndStadium(gameId);
    const cheeringTeam = await this.teamCoreService.findOne(cheeringTeamId);

    const saveInput: SaveRegisteredGameInput = {
      image: image ?? null,
      seat,
      review,
      game: {
        id: game.id,
        status: game.status,
        homeTeam: { id: game.home_team.id },
        awayTeam: { id: game.away_team.id },
      },
      cheeringTeam: { id: cheeringTeam.id },
      userId,
    };

    const savedRegisteredGame =
      await this.registeredGameCoreService.save(saveInput);

    if (savedRegisteredGame.status !== null) {
      await this.rankCoreService.updateRankRecord(
        {
          teamId: cheeringTeam.id,
          userId,
          status: savedRegisteredGame.status,
          activeYear: new Date(game.date).getFullYear(),
        },
        true,
      );
    }
    runOnTransactionCommit(async () => {
      const data =
        await this.rankCoreService.aggregateRankStatsByUserId(userId);
      await this.rankingRedisService.updateRankings(userId, data);
    });

    const { full_name, ...restStadium } = game.stadium;
    const responseData = {
      id: savedRegisteredGame.id,
      image: savedRegisteredGame.image,
      seat: savedRegisteredGame.seat,
      review: savedRegisteredGame.review,
      status: savedRegisteredGame.status,
      game: {
        id: game.id,
        date: game.date,
        time: game.time,
        status: game.status,
        stadium: { ...restStadium, fullName: full_name },
      },
      cheering_team: cheeringTeam,
    };

    return plainToInstance(RegisteredGameWithGameResponseDto, responseData, {
      excludeExtraneousValues: true,
    });
  }

  @Transactional()
  async update(
    id: number,
    dto: UpdateRegisteredGameDto,
    userId: number,
  ): Promise<void> {
    const { imageCtx, teamCtx } = await this.registeredGameCoreService.update(
      id,
      {
        cheeringTeamId: dto.cheeringTeamId,
        seat: dto.seat,
        review: dto.review,
        image: dto.image,
      },
      userId,
    );
    if (teamCtx.isChanged) {
      const { prevTeamId, newTeamId, prevStatus, changedStatus, year } =
        teamCtx;
      // 이전 cheering team 랭킹 업데이트
      await this.rankCoreService.updateRankRecord(
        { teamId: prevTeamId, userId, activeYear: year, status: prevStatus },
        false,
      );
      // 변경된 cheering team 랭킹 업데이트
      await this.rankCoreService.updateRankRecord(
        { teamId: newTeamId, userId, activeYear: year, status: changedStatus },
        true,
      );

      // 후처리 로직
      runOnTransactionCommit(async () => {
        if (imageCtx.isChanged) {
          await this.awsS3Service.deleteImage({
            fileUrl: imageCtx.prevImage,
          });
        }
        if (teamCtx.isChanged) {
          const data =
            await this.rankCoreService.aggregateRankStatsByUserId(userId);
          await this.rankingRedisService.updateRankings(userId, data);
        }
      });
      return;
    }
  }

  @Transactional()
  async delete(dto: {
    registeredGameId: number;
    userId: number;
  }): Promise<void> {
    const { userId } = dto;
    const { imageCtx, gameCtx } =
      await this.registeredGameCoreService.delete(dto);

    if (gameCtx.status !== null) {
      const { status, teamId, year } = gameCtx;
      await this.rankCoreService.updateRankRecord(
        { teamId, userId, activeYear: year, status },
        false,
      );
    }

    // 후처리 작업
    runOnTransactionCommit(async () => {
      if (imageCtx.prevImage) {
        await this.awsS3Service.deleteImage({
          fileUrl: imageCtx.prevImage,
        });
      }
      if (gameCtx.status !== null) {
        const data =
          await this.rankCoreService.aggregateRankStatsByUserId(userId);
        await this.rankingRedisService.updateRankings(userId, data);
      }
    });
    return;
  }
}
