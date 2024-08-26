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
        user: user,
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

    this.defineStatus(game, registeredGame);

    await qrManager.save(registeredGame);

    if (registeredGame.status !== null) {
      await this.rankService.updateRankEntity(
        {
          team_id: registeredGame.cheering_team.id,
          user_id: registeredGame.user.id,
          status: registeredGame.status,
          year: moment(game.date).year(),
        },
        qrManager,
      );

      await this.rankService.updateRedisRankings(user.id, qrManager);
    }

    return registeredGame;
  }

  async findAll(user: User): Promise<RegisteredGame[]> {
    const registeredGames = await this.registeredGameRepository.find({
      where: { user },
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
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // month를 넘어가지 않도록 조정

    const registeredGames = await this.registeredGameRepository.find({
      where: {
        user,
        created_at: Between(startDate, endDate),
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
    });

    return registeredGames;
  }

  async findOne(id: number, user: User): Promise<RegisteredGame> {
    const registeredGame = await this.registeredGameRepository.findOne({
      where: { id, user },
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
      where: { id, user },
      relations: { cheering_team: true, game: true },
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

  async delete(id: number, user: User): Promise<void> {
    const registeredGame = await this.findOne(id, user);
    this.awsS3Service.deleteImage({
      fileUrl: registeredGame.image,
    });
    const result = await this.registeredGameRepository.delete({ id, user });
    if (result.affected === 0) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
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
        const game = registeredGame.game;

        this.defineStatus(game, registeredGame);

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
          qrRunner.manager,
        );
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

  private defineStatus(game: Game, registeredGame: RegisteredGame): void {
    if (game.status === '경기종료') {
      if (game.away_team_score > game.home_team_score) {
        registeredGame.status =
          registeredGame.cheering_team.id === game.away_team.id
            ? 'Win'
            : 'Lose';
      } else if (game.away_team_score < game.home_team_score) {
        registeredGame.status =
          registeredGame.cheering_team.id === game.home_team.id
            ? 'Win'
            : 'Lose';
      } else {
        registeredGame.status = 'Tie';
      }
    } else if (/.*취소$/.test(game.status)) {
      registeredGame.status = 'No game';
    } else {
      registeredGame.status = null;
    }
  }
}
