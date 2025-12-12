import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RegisteredGame } from './domain/registered-game.entity';
import { SaveRegisteredGameDto } from '../dto/internal/save-registered-game.dto';
import { UpdateRegisteredGameDto } from '../dto/request/req-update-registered-game.dto';
import { RegisteredGameStatus } from '../types/registered-game-status.type';
import { DeleteRegisteredGameDto } from '../dto/internal/delete-registered-game.dto';
import {
  RegisteredGameAlreadyRegisteredError,
  RegisteredGameNotFoundError,
} from './domain/error/registered-game.error';

@Injectable()
export class RegisteredGameCoreService {
  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepo: Repository<RegisteredGame>,
  ) {}

  async getByGameId(gameId: string, where?: FindOptionsWhere<RegisteredGame>) {
    const registeredGame = await this.registeredGameRepo.find({
      where: { game: { id: gameId }, ...where },
      relations: {
        game: { home_team: true, away_team: true, winning_team: true },
        cheering_team: true,
        user: true,
      },
    });
    return registeredGame;
  }
  async saveBulk(data: RegisteredGame[]) {
    const savedRegisteredGames = await this.registeredGameRepo.save(data);
    return savedRegisteredGames;
  }
  async save(data: SaveRegisteredGameDto): Promise<RegisteredGame> {
    const { image, seat, review, game, cheeringTeam, user } = data;

    const isDuplicate = await this.registeredGameRepo.findOne({
      where: { game: { id: game.id }, user: { id: user.id } },
    });
    if (isDuplicate) {
      throw new RegisteredGameAlreadyRegisteredError();
    }

    const newRegisteredGame = RegisteredGame.create({
      image,
      seat,
      review,
      userId: user.id,
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
    dto: UpdateRegisteredGameDto,
    userId: number,
  ): Promise<{
    imageCtx: {
      isChanged: boolean;
      prevImage: string | null;
    };
    teamCtx: {
      isChanged: boolean;
      prevTeamId: number;
      newTeamId: number;
      prevStatus: RegisteredGameStatus | null;
      changedStatus: RegisteredGameStatus | null;
      year: number;
    };
  }> {
    const { cheeringTeamId, seat, review, image } = dto;

    const registeredGame = await this.registeredGameRepo.findOne({
      where: { id, user: { id: userId } },
      relations: {
        game: { home_team: true, away_team: true },
        cheering_team: true,
      },
    });
    if (!registeredGame) {
      throw new RegisteredGameNotFoundError();
    }

    const prevImage = registeredGame.image;
    const prevTeamId = registeredGame.cheering_team.id;
    const prevStatus = registeredGame.status;

    registeredGame.updateImage(image);
    registeredGame.updateReviewAndSeat(review, seat);
    registeredGame.updateCheeringTeam({
      cheeringTeamId,
      homeTeamId: registeredGame.game.home_team.id,
      awayTeamId: registeredGame.game.away_team.id,
    });
    await this.registeredGameRepo.save(registeredGame);

    const result = {
      imageCtx: { isChanged: prevImage !== image, prevImage },
      teamCtx: {
        isChanged: prevTeamId !== cheeringTeamId,
        prevTeamId: prevTeamId,
        newTeamId: cheeringTeamId,
        prevStatus,
        changedStatus: registeredGame.status,
        year: new Date(registeredGame.game.date).getFullYear(),
      },
    };

    return result;
  }

  async delete(dto: DeleteRegisteredGameDto): Promise<{
    imageCtx: {
      prevImage: string | null;
    };
    gameCtx: {
      status: RegisteredGameStatus | null;
      teamId: number;
      year: number;
    };
  }> {
    const { RegisteredGameId, userId } = dto;
    const registeredGame = await this.registeredGameRepo.findOne({
      where: { id: RegisteredGameId, user: { id: userId } },
      relations: {
        game: { home_team: true, away_team: true },
        cheering_team: true,
      },
    });

    if (!registeredGame) {
      throw new RegisteredGameNotFoundError();
    }

    const prevImage = registeredGame.image;
    const gameCtx = {
      status: registeredGame.status,
      teamId: registeredGame.cheering_team.id,
      year: new Date(registeredGame.game.date).getFullYear(),
    };

    await this.registeredGameRepo.remove(registeredGame);
    return { imageCtx: { prevImage }, gameCtx };
  }
}
