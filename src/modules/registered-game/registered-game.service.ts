import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Between, IsNull } from 'typeorm';
import { TeamService } from '../team/team.service';
import { GameService } from '../game/game.service';
import * as moment from 'moment';
import { RankService } from '../rank/rank.service';
import { AwsS3Service } from '../../core/aws-s3/aws-s3.service';
import { Transactional } from 'typeorm-transactional';
import { RegisteredGameStatus } from './types/registered-game-status.type';
import { RegisteredGameWithGameDto } from './dto/internal/registered-game-with-game.dto';
import { CreateRegisteredGameDto } from './dto/request/req-create-registered-game.dto';
import { UpdateRegisteredGameDto } from './dto/request/req-update-registered-game.dto';
import { DeleteRegisteredGameDto } from './dto/internal/delete-registered-game.dto';
import {
  IRegisteredGameRepository,
  REGISTERED_GAME_REPOSITORY,
} from './repository/registered-game.repository.interface';
import { SaveRegisteredGameDto } from './dto/internal/save-registered-game.dto';
import { DetermineGameStatusDto } from './dto/internal/determine-game-status.dto';

@Injectable()
export class RegisteredGameService {
  private readonly logger = new Logger(RegisteredGameService.name);

  constructor(
    @Inject(REGISTERED_GAME_REPOSITORY)
    private readonly registeredGameRepo: IRegisteredGameRepository,
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
    private readonly rankService: RankService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Transactional()
  async create(
    createRegisteredGameDto: CreateRegisteredGameDto,
    userId: number,
  ): Promise<RegisteredGameWithGameDto> {
    const game = await this.gameService.findOne(createRegisteredGameDto.gameId);
    const cheeringTeam = await this.teamService.findOne(
      createRegisteredGameDto.cheeringTeamId,
    );

    const duplicate = await this.registeredGameRepo.findOne({
      game: { id: createRegisteredGameDto.gameId },
      user: { id: userId },
    });

    if (duplicate)
      throw new ConflictException(
        'Users cannot register for more than one copy of the same game.',
      );

    const registeredGame = await SaveRegisteredGameDto.createAndValidate({
      ...createRegisteredGameDto,
      game,
      cheering_team: cheeringTeam,
      user: { id: userId },
      status: this.getStatus(
        {
          status: game.status,
          homeTeamScore: game.home_team_score,
          awayTeamScore: game.away_team_score,
          homeTeamId: game.home_team.id,
          awayTeamId: game.away_team.id,
        },
        cheeringTeam.id,
      ),
    });

    const { insertedId } = await this.registeredGameRepo.insert(registeredGame);

    if (registeredGame.status !== null) {
      await this.rankService.updateRankEntity(
        {
          team_id: registeredGame.cheering_team.id,
          user_id: registeredGame.user.id,
          status: registeredGame.status,
          year: moment(game.date).year(),
        },
        true,
      );

      await this.rankService.updateRedisRankings(userId);
    }

    return await RegisteredGameWithGameDto.createAndValidate({
      id: insertedId,
      ...registeredGame,
    });
  }

  async getAll(userId: number): Promise<RegisteredGameWithGameDto[]> {
    const registeredGames = await this.registeredGameRepo.find({
      user: { id: userId },
    });
    return registeredGames;
  }

  async getAllMonthly(
    year: number,
    month: number,
    userId: number,
  ): Promise<RegisteredGameWithGameDto[]> {
    const startDate = moment
      .tz(`${year}-${month.toString().padStart(2, '0')}-01`, 'Asia/Seoul')
      .startOf('day')
      .format('YYYY-MM-DD');
    const endDate = moment
      .tz(`${year}-${month.toString().padStart(2, '0')}-01`, 'Asia/Seoul')
      .endOf('month')
      .format('YYYY-MM-DD');

    const registeredGames = await this.registeredGameRepo.find(
      { user: { id: userId }, game: { date: Between(startDate, endDate) } },
      { game: { date: 'DESC' } },
    );

    return registeredGames;
  }

  async getOne(id: number, userId: number): Promise<RegisteredGameWithGameDto> {
    const registeredGame = await this.registeredGameRepo.findOne({
      id,
      user: { id: userId },
    });
    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }

    return registeredGame;
  }

  @Transactional()
  async update(
    id: number,
    updateRegisteredGameDto: UpdateRegisteredGameDto,
    userId: number,
  ): Promise<void> {
    const registeredGame = await this.registeredGameRepo.findOne({
      id,
      user: { id: userId },
    });

    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
    const teams = await this.teamService.findAll();
    const updateData = {
      review: updateRegisteredGameDto.review,
      seat: updateRegisteredGameDto.seat,
      cheeringTeam: teams.filter(
        (team) => team.id === updateRegisteredGameDto.cheeringTeamId,
      )[0],
    };
    if (updateRegisteredGameDto.image) {
      if (registeredGame.image) {
        await this.awsS3Service.deleteImage({
          fileUrl: registeredGame.image,
        });
      }
      updateData['image'] = updateRegisteredGameDto.image;
    }

    if (
      updateRegisteredGameDto.cheeringTeamId !== registeredGame.cheeringTeam.id
    ) {
      // 변경된 cheering team의 status 업데이트
      const changeStatus = this.getStatus(
        {
          status: registeredGame.game.status,
          homeTeamScore: registeredGame.game.homeTeamScore,
          awayTeamScore: registeredGame.game.awayTeamScore,
          homeTeamId: registeredGame.game.homeTeam.id,
          awayTeamId: registeredGame.game.awayTeam.id,
        },
        updateRegisteredGameDto.cheeringTeamId,
      );
      // 업데이트할 데이터에 status 추가
      updateData['status'] = changeStatus;

      // 기존 cheering team 랭킹 업데이트
      await this.rankService.updateRankEntity(
        {
          status: registeredGame.status,
          team_id: registeredGame.cheeringTeam.id,
          user_id: userId,
          year: moment(registeredGame.game.date).year(),
        },
        false,
      );
      //변경 cheering team 랭킹 업데이트
      await this.rankService.updateRankEntity(
        {
          status: changeStatus,
          team_id: updateRegisteredGameDto.cheeringTeamId,
          user_id: userId,
          year: moment(registeredGame.game.date).year(),
        },
        true,
      );

      //랭킹 변경사항 레디스 적용
      await this.rankService.updateRedisRankings(userId);
    }
    await this.registeredGameRepo.update(updateData, id, userId);
  }

  @Transactional()
  async delete(dto: DeleteRegisteredGameDto): Promise<void> {
    const registeredGame = await this.getOne(dto.gameId, dto.userId);
    const status = registeredGame.status;
    const team_id = registeredGame.cheeringTeam.id;
    const user_id = dto.userId;
    const year = moment(registeredGame.game.date).year();

    const result = await this.registeredGameRepo.delete(dto);

    if (!result) {
      throw new NotFoundException(
        `Registered game with ID ${dto.gameId} not found`,
      );
    }
    await this.awsS3Service.deleteImage({
      fileUrl: registeredGame.image,
    });
    if (status !== null) {
      await this.rankService.updateRankEntity(
        { status, team_id, user_id, year },
        false,
      );
      await this.rankService.updateRedisRankings(user_id);
    }
  }

  @Transactional()
  async batchBulkUpdateByGameId(gameId: string) {
    try {
      const game = await this.gameService.findOne(gameId);
      const registeredGames = await this.registeredGameRepo.findWithUser({
        game: { id: gameId },
        status: IsNull(),
      });
      if (!registeredGames.length) {
        this.logger.log(
          `당일 경기:${gameId}을 경기 중에 등록한 유저 없음. 스킵`,
        );
        return;
      }

      for (const registeredGame of registeredGames) {
        const team_id = registeredGame.cheeringTeam.id;
        const user_id = registeredGame.user.id;
        const statusDto = await DetermineGameStatusDto.createAndValidate({
          status: game.status,
          homeTeamScore: game.home_team_score,
          awayTeamScore: game.away_team_score,
          homeTeamId: game.home_team.id,
          awayTeamId: game.away_team.id,
        });
        registeredGame.status = this.getStatus(statusDto, team_id);

        const registeredSaveDto =
          await SaveRegisteredGameDto.createAndValidate(registeredGame);

        // 직관 경기 저장
        const updatedGame =
          await this.registeredGameRepo.save(registeredSaveDto);
        const status = updatedGame.status;
        // Rank 업데이트
        await this.rankService.updateRankEntity(
          {
            status,
            team_id,
            user_id,
            year: moment(game.date).year(),
          },
          true,
        );
        await this.rankService.updateRedisRankings(user_id);
      }

      this.logger.log(`당일 경기:${gameId} 상태 업데이트 후 트랜잭션 성공`);
    } catch (error) {
      this.logger.error(
        `당일 경기:${gameId} 상태 업데이트 후 트랜잭션 실패`,
        error.stack,
      );
    }
  }

  private getStatus(
    dto: DetermineGameStatusDto,
    cheeringTeamId: number,
  ): RegisteredGameStatus | null {
    const { status, homeTeamScore, awayTeamScore, homeTeamId, awayTeamId } =
      dto;
    if (
      /.*취소$/.test(status) ||
      status === '그라운드사정' ||
      status === '기타'
    ) {
      return 'No game';
    }
    if (status === '경기종료') {
      if (awayTeamScore === homeTeamScore) {
        return 'Tie';
      }
      const winningTeamId =
        awayTeamScore > homeTeamScore ? awayTeamId : homeTeamId;
      return cheeringTeamId === winningTeamId ? 'Win' : 'Lose';
    }
    return null;
  }
}
