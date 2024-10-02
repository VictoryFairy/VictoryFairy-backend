import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  QueryRunner,
  Repository,
} from 'typeorm';
import {
  CreateRegisteredGameDto,
  UpdateRegisteredGameDto,
} from 'src/dtos/registered-game.dto';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { TeamService } from './team.service';
import { GameService } from './game.service';
import { Game } from 'src/entities/game.entity';
import * as moment from 'moment';
import { RankService } from './rank.service';
import { AwsS3Service } from './aws-s3.service';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';

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

  async create(
    createRegisteredGameDto: CreateRegisteredGameDto,
    user: User,
    qrManager: EntityManager,
  ): Promise<RegisteredGame> {
    const game = await this.gameService.findOne(createRegisteredGameDto.gameId);
    const cheeringTeam = await this.teamService.findOne(
      createRegisteredGameDto.cheeringTeamId,
    );

    const duplcate = await qrManager.getRepository(RegisteredGame).findOne({
      where: {
        game: game,
        user: { id: user.id },
      },
    });

    if (duplcate)
      throw new ConflictException(
        'Users cannot register for more than one copy of the same game.',
      );

    const registeredGame = qrManager.create(RegisteredGame, {
      ...createRegisteredGameDto,
      game,
      cheering_team: cheeringTeam,
      user,
    });

    const registeredGameStatus = this.getStatus(game, registeredGame);
    registeredGame.status = registeredGameStatus;

    await qrManager.save(registeredGame);

    if (registeredGame.status !== null) {
      await this.rankService.updateRankEntity(
        {
          team_id: registeredGame.cheering_team.id,
          user_id: registeredGame.user.id,
          status: registeredGame.status,
          year: moment(game.date).year(),
        },
        true,
        qrManager,
      );

      await this.rankService.updateRedisRankings(user.id, qrManager);
    }

    return registeredGame;
  }

  async findAll(user: User): Promise<RegisteredGame[]> {
    const registeredGames = await this.registeredGameRepository.find({
      where: { user: { id: user.id } },
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
    user: User,
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
        user: { id: user.id },
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

  async findOne(
    id: number,
    user: User,
    qrManager?: EntityManager,
  ): Promise<RegisteredGame> {
    const repository = qrManager
      ? qrManager.getRepository(RegisteredGame)
      : this.registeredGameRepository;
    const registeredGame = await repository.findOne({
      where: { id, user: { id: user.id } },
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

  async update(
    id: number,
    updateRegisteredGameDto: UpdateRegisteredGameDto,
    user: User,
  ): Promise<void> {
    const registeredGame = await this.registeredGameRepository.findOne({
      where: { id, user: { id: user.id } },
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

  async delete(
    id: number,
    user: User,
    qrManager: EntityManager,
  ): Promise<void> {
    const registeredGame = await this.findOne(id, user, qrManager);
    const status = registeredGame.status;
    const team_id = registeredGame.cheering_team.id;
    const user_id = user.id;
    const year = moment(registeredGame.game.date).year();

    await this.awsS3Service.deleteImage({
      fileUrl: registeredGame.image,
    });
    const result = await qrManager
      .getRepository(RegisteredGame)
      .delete({ id, user });
    if (result.affected === 0) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
    if (status !== null) {
      await this.rankService.updateRankEntity(
        { status, team_id, user_id, year },
        false,
        qrManager,
      );
      await this.rankService.updateRedisRankings(user_id, qrManager);
    }
  }

  async batchBulkUpdateByGameId(gameId: string) {
    const qrRunner: QueryRunner = this.dataSource.createQueryRunner();

    await qrRunner.connect();
    await qrRunner.startTransaction();

    try {
      const game = await this.gameService.findOne(gameId);
      const registeredGames = await this.registeredGameRepository.find({
        where: {
          game,
          status: null,
        },
        relations: { cheering_team: true, game: true, user: true },
      });

      for (const registeredGame of registeredGames) {
        const team_id = registeredGame.cheering_team.id;
        const user_id = registeredGame.user.id;

        const registeredGameStatus = this.getStatus(game, registeredGame);
        registeredGame.status = registeredGameStatus;

        // 직관 경기 저장
        const updatedGame = await qrRunner.manager
          .getRepository(RegisteredGame)
          .save(registeredGame);
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
          qrRunner.manager,
        );
        await this.rankService.updateRedisRankings(user_id, qrRunner.manager);
      }

      await qrRunner.commitTransaction();
      this.logger.log(`당일 경기:${gameId} 상태 업데이트 후 트랜잭션 성공`);
    } catch (error) {
      await qrRunner.rollbackTransaction();
      this.logger.error(
        `당일 경기:${gameId} 상태 업데이트 후 트랜잭션 실패`,
        error.stack,
      );
    } finally {
      await qrRunner.release();
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
