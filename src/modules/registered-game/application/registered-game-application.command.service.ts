import { Injectable } from '@nestjs/common';
import { RegisteredGameCoreService } from '../core/registered-game-core.service';
import { RegisteredGameWithGameDto } from '../dto/internal/registered-game-with-game.dto';
import { CreateRegisteredGameDto } from '../dto/request/req-create-registered-game.dto';
import { GameCoreService } from 'src/modules/game/core/game-core.service';
import { TeamService } from 'src/modules/team/team.service';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { SaveRegisteredGameDto } from '../dto/internal/save-registered-game.dto';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { UpdateRegisteredGameDto } from '../dto/request/req-update-registered-game.dto';
import { AwsS3Service } from 'src/infra/aws-s3/aws-s3.service';
import { DeleteRegisteredGameDto } from '../dto/internal/delete-registered-game.dto';

@Injectable()
export class RegisteredGameApplicationCommandService {
  constructor(
    private readonly registeredGameCoreService: RegisteredGameCoreService,
    private readonly gameCoreService: GameCoreService,
    private readonly teamService: TeamService,
    private readonly rankCoreService: RankCoreService,
    private readonly rankingRedisService: RankingRedisService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Transactional()
  async register(
    registeredGameDto: CreateRegisteredGameDto,
    userId: number,
  ): Promise<RegisteredGameWithGameDto> {
    const { gameId, cheeringTeamId, ...rest } = registeredGameDto;
    const game = await this.gameCoreService.getOneWithTeams(gameId);
    const getCheeringTeam = await this.teamService.findOne(cheeringTeamId);

    const newRegisteredGameDto = await SaveRegisteredGameDto.createAndValidate({
      ...rest,
      game,
      cheeringTeam: getCheeringTeam,
      user: { id: userId },
    });
    const saveRegisteredGame =
      await this.registeredGameCoreService.save(newRegisteredGameDto);

    if (saveRegisteredGame.status !== null) {
      await this.rankCoreService.updateRankRecord(
        {
          teamId: newRegisteredGameDto.cheeringTeam.id,
          userId,
          status: saveRegisteredGame.status,
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

    return await RegisteredGameWithGameDto.createAndValidate({
      id: saveRegisteredGame.id,
      ...newRegisteredGameDto,
      cheering_team: getCheeringTeam,
    });
  }

  @Transactional()
  async update(
    id: number,
    updateRegisteredGameDto: UpdateRegisteredGameDto,
    userId: number,
  ): Promise<void> {
    const { imageCtx, teamCtx } = await this.registeredGameCoreService.update(
      id,
      updateRegisteredGameDto,
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
  async delete(dto: DeleteRegisteredGameDto): Promise<void> {
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
