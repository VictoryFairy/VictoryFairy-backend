import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, IsNull, Repository } from 'typeorm';
import { RegisteredGame } from 'src/modules/registered-game/entities/registered-game.entity';
import { TeamService } from '../team/team.service';
import { GameService } from '../game/game.service';
import * as moment from 'moment';
import { RankService } from '../rank/rank.service';
import { AwsS3Service } from '../../core/aws-s3/aws-s3.service';
import { TRegisteredGameStatus } from 'src/modules/registered-game/types/registered-game-status.type';
import { Transactional } from 'typeorm-transactional';
import { Game } from '../game/entities/game.entity';
import {
  CreateRegisteredGameDto,
  UpdateRegisteredGameDto,
} from './dto/registered-game.dto';

@Injectable()
export class RegisteredGameService {
  private readonly logger = new Logger(RegisteredGameService.name);

  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
    private readonly rankService: RankService,
    private readonly awsS3Service: AwsS3Service,
    private readonly dataSource: DataSource,
  ) {}

  @Transactional()
  async create(
    createRegisteredGameDto: CreateRegisteredGameDto,
    userId: number,
  ): Promise<RegisteredGame> {
    const game = await this.gameService.findOne(createRegisteredGameDto.gameId);
    const cheeringTeam = await this.teamService.findOne(
      createRegisteredGameDto.cheeringTeamId,
    );

    const duplcate = await this.registeredGameRepository.findOne({
      where: {
        game: game,
        user: { id: userId },
      },
    });

    if (duplcate)
      throw new ConflictException(
        'Users cannot register for more than one copy of the same game.',
      );

    const registeredGame = this.registeredGameRepository.create({
      ...createRegisteredGameDto,
      game,
      cheering_team: cheeringTeam,
      user: { id: userId },
    });

    const registeredGameStatus = this.getStatus(game, registeredGame);
    registeredGame.status = registeredGameStatus;

    await this.registeredGameRepository.save(registeredGame);

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

    return registeredGame;
  }

  async findAll(userId: number): Promise<RegisteredGame[]> {
    const registeredGames = await this.registeredGameRepository.find({
      where: { user: { id: userId } },
      relations: {
        cheering_team: true,
        game: {
          home_team: true,
          away_team: true,
          stadium: true,
          winning_team: true,
        },
      },
    });
    return registeredGames;
  }

  async findAllMonthly(
    year: number,
    month: number,
    userId: number,
  ): Promise<RegisteredGame[]> {
    const startDate = moment
      .tz(`${year}-${month}-01`, 'Asia/Seoul')
      .startOf('day')
      .format('YYYY-MM-DD');
    const endDate = moment
      .tz(`${year}-${month}-01`, 'Asia/Seoul')
      .endOf('month')
      .format('YYYY-MM-DD');

    const registeredGames = await this.registeredGameRepository.find({
      where: {
        user: { id: userId },
        game: {
          date: Between(startDate, endDate),
        },
      },
      relations: {
        cheering_team: true,
        game: {
          home_team: true,
          away_team: true,
          stadium: true,
          winning_team: true,
        },
      },
      order: {
        game: {
          date: 'DESC',
        },
      },
    });

    return registeredGames;
  }

  async findOne(id: number, userId: number): Promise<RegisteredGame> {
    const registeredGame = await this.registeredGameRepository.findOne({
      where: { id, user: { id: userId } },
      relations: {
        cheering_team: true,
        game: {
          home_team: true,
          away_team: true,
          stadium: true,
          winning_team: true,
        },
      },
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
    const registeredGame = await this.registeredGameRepository.findOne({
      where: { id, user: { id: userId } },
      relations: {
        cheering_team: true,
        game: {
          home_team: true,
          away_team: true,
          stadium: true,
          winning_team: true,
        },
      },
    });

    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }

    if (updateRegisteredGameDto.cheeringTeamId !== undefined) {
      const cheeringTeam = await this.teamService.findOne(
        updateRegisteredGameDto.cheeringTeamId,
      );

      if (!cheeringTeam) {
        throw new NotFoundException(
          `Team with ID ${updateRegisteredGameDto.cheeringTeamId} not found`,
        );
      }
      registeredGame.cheering_team = cheeringTeam;
      registeredGame.status = this.getStatus(
        registeredGame.game,
        registeredGame,
      );
    }
    if (updateRegisteredGameDto.image !== undefined) {
      this.awsS3Service.deleteImage({
        fileUrl: registeredGame.image,
      });
      registeredGame.image = updateRegisteredGameDto.image;
    }
    if (updateRegisteredGameDto.seat !== undefined) {
      registeredGame.seat = updateRegisteredGameDto.seat;
    }
    if (updateRegisteredGameDto.review !== undefined) {
      registeredGame.review = updateRegisteredGameDto.review;
    }

    await this.registeredGameRepository.save(registeredGame);
  }

  @Transactional()
  async delete(id: number, userId: number): Promise<void> {
    const registeredGame = await this.findOne(id, userId);
    const status = registeredGame.status;
    const team_id = registeredGame.cheering_team.id;
    const user_id = userId;
    const year = moment(registeredGame.game.date).year();

    await this.awsS3Service.deleteImage({
      fileUrl: registeredGame.image,
    });
    const result = await this.registeredGameRepository.delete({
      id,
      user: { id: userId },
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
    if (status !== null) {
      await this.rankService.updateRankEntity(
        { status, team_id, user_id, year },
        false,
      );
      await this.rankService.updateRedisRankings(userId);
    }
  }

  @Transactional()
  async batchBulkUpdateByGameId(gameId: string) {
    try {
      const game = await this.gameService.findOne(gameId);
      const registeredGames = await this.registeredGameRepository.find({
        where: {
          game: { id: gameId },
          status: IsNull(),
        },
        relations: { cheering_team: true, game: true, user: true },
      });
      if (!registeredGames.length) {
        this.logger.log(
          `당일 경기:${gameId}을 경기 중에 등록한 유저 없음. 스킵`,
        );
        return;
      }

      for (const registeredGame of registeredGames) {
        const team_id = registeredGame.cheering_team.id;
        const user_id = registeredGame.user.id;

        const registeredGameStatus = this.getStatus(game, registeredGame);
        registeredGame.status = registeredGameStatus;

        // 직관 경기 저장
        const updatedGame =
          await this.registeredGameRepository.save(registeredGame);
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
    game: Game,
    registeredGame: RegisteredGame,
  ): TRegisteredGameStatus | null {
    if (/.*취소$/.test(game.status) || game.status === '그라운드사정') {
      return 'No game';
    }
    if (game.status === '경기종료') {
      if (game.away_team_score === game.home_team_score) {
        return 'Tie';
      }
      const winningTeamId =
        game.away_team_score > game.home_team_score
          ? game.away_team.id
          : game.home_team.id;
      return registeredGame.cheering_team.id === winningTeamId ? 'Win' : 'Lose';
    }
    return null;
  }
}
