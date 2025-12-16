import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RegisteredGame } from './domain/registered-game.entity';
import { RegisteredGameStatus } from './types/registered-game-status.type';
import {
  RegisteredGameAlreadyRegisteredError,
  RegisteredGameNotFoundError,
} from './domain/error/registered-game.error';
import {
  DeleteRegisteredGameInput,
  DeleteRegisteredGameResult,
  RegisteredGameWithGameAndTeam,
  RegisteredGameWithRelations,
  SaveRegisteredGameInput,
  UpdateRegisteredGameInput,
  UpdateRegisteredGameResult,
} from './types/registered-game.interface';

@Injectable()
export class RegisteredGameCoreService {
  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepo: Repository<RegisteredGame>,
  ) {}

  async getByGameId(
    gameId: string,
    where?: FindOptionsWhere<RegisteredGame>,
  ): Promise<RegisteredGameWithRelations[]> {
    const registeredGames = await this.registeredGameRepo.find({
      where: { game: { id: gameId }, ...where },
      relations: {
        game: { home_team: true, away_team: true, winning_team: true },
        cheering_team: true,
        user: true,
      },
    });
    return registeredGames as RegisteredGameWithRelations[];
  }

  async saveBulk(data: RegisteredGame[]): Promise<RegisteredGame[]> {
    const savedRegisteredGames = await this.registeredGameRepo.save(data);
    return savedRegisteredGames;
  }

  async save(data: SaveRegisteredGameInput): Promise<RegisteredGame> {
    const { image, seat, review, game, cheeringTeam, userId } = data;

    const isDuplicate = await this.registeredGameRepo.findOne({
      where: { game: { id: game.id }, user: { id: userId } },
    });
    if (isDuplicate) {
      throw new RegisteredGameAlreadyRegisteredError();
    }

    const newRegisteredGame = RegisteredGame.create({
      image,
      seat,
      review,
      userId,
      cheeringTeamId: cheeringTeam.id,
      gameMetaData: {
        gameId: game.id,
        homeTeamId: game.homeTeam.id,
        awayTeamId: game.awayTeam.id,
      },
    });

    newRegisteredGame.determineStatus(game.status, cheeringTeam.id);

    const savedRegisteredGame =
      await this.registeredGameRepo.save(newRegisteredGame);
    return savedRegisteredGame;
  }

  async update(
    id: number,
    data: UpdateRegisteredGameInput,
    userId: number,
  ): Promise<UpdateRegisteredGameResult> {
    const { cheeringTeamId, seat, review, image } = data;

    const registeredGame = (await this.registeredGameRepo.findOne({
      where: { id, user: { id: userId } },
      relations: {
        game: { home_team: true, away_team: true },
        cheering_team: true,
      },
    })) as RegisteredGameWithGameAndTeam | null;

    if (!registeredGame) {
      throw new RegisteredGameNotFoundError();
    }

    const prevImage = registeredGame.image;
    const prevTeamId = registeredGame.cheering_team.id;
    const prevStatus = registeredGame.status as RegisteredGameStatus | null;

    registeredGame.updateImage(image);
    registeredGame.updateReviewAndSeat(review, seat);
    registeredGame.updateCheeringTeam({
      cheeringTeamId,
      homeTeamId: registeredGame.game.home_team.id,
      awayTeamId: registeredGame.game.away_team.id,
    });
    await this.registeredGameRepo.save(registeredGame);

    const result: UpdateRegisteredGameResult = {
      imageCtx: { isChanged: prevImage !== image, prevImage },
      teamCtx: {
        isChanged: prevTeamId !== cheeringTeamId,
        prevTeamId: prevTeamId,
        newTeamId: cheeringTeamId,
        prevStatus,
        changedStatus: registeredGame.status as RegisteredGameStatus | null,
        year: new Date(registeredGame.game.date).getFullYear(),
      },
    };

    return result;
  }

  async delete(
    data: DeleteRegisteredGameInput,
  ): Promise<DeleteRegisteredGameResult> {
    const { registeredGameId, userId } = data;
    const registeredGame = (await this.registeredGameRepo.findOne({
      where: { id: registeredGameId, user: { id: userId } },
      relations: {
        game: { home_team: true, away_team: true },
        cheering_team: true,
      },
    })) as RegisteredGameWithGameAndTeam | null;

    if (!registeredGame) {
      throw new RegisteredGameNotFoundError();
    }

    const prevImage = registeredGame.image;
    const gameCtx = {
      status: registeredGame.status as RegisteredGameStatus | null,
      teamId: registeredGame.cheering_team.id,
      year: new Date(registeredGame.game.date).getFullYear(),
    };

    await this.registeredGameRepo.remove(registeredGame);
    return { imageCtx: { prevImage }, gameCtx };
  }
}
