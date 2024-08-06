import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  CreateRegisteredGameDto,
  RegisteredGameDto,
  UpdateRegisteredGameDto,
} from 'src/dtos/registered-game.dto';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { TeamService } from './team.service';
import { GameService } from './game.service';

@Injectable()
export class RegisteredGameService {
  private readonly logger = new Logger(RegisteredGameService.name);

  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
  ) {}

  async create(
    createRegisteredGameDto: CreateRegisteredGameDto,
    user: User,
  ): Promise<RegisteredGameDto> {
    const game = await this.gameService.findOne(createRegisteredGameDto.gameId);
    const cheeringTeam = await this.teamService.findOne(
      createRegisteredGameDto.cheeringTeamId,
    );

    const registeredGame = this.registeredGameRepository.create({
      ...createRegisteredGameDto,
      game,
      cheering_team: cheeringTeam,
      user,
    });

    await this.registeredGameRepository.save(registeredGame);

    return plainToInstance(RegisteredGameDto, registeredGame);
  }

  async findAll(user: User): Promise<RegisteredGameDto[]> {
    const registeredGames = await this.registeredGameRepository.find({
      where: { user },
      relations: { cheering_team: true, game: true },
    });
    return plainToInstance(RegisteredGameDto, registeredGames);
  }

  async findAllMonthly(year: number, month: number, user: User): Promise<RegisteredGameDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // month를 넘어가지 않도록 조정

    const registeredGames = await this.registeredGameRepository.find({
      where: { 
        user, 
        created_at: Between(startDate, endDate)
      },
      relations: { cheering_team: true, game: true },
    });

    return plainToInstance(RegisteredGameDto, registeredGames);
  }

  async findOne(id: number, user: User): Promise<RegisteredGameDto> {
    const registeredGame = await this.registeredGameRepository.findOne({
      where: { id, user },
      relations: { cheering_team: true, game: true },
    });
    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
    return plainToInstance(RegisteredGameDto, registeredGame);
  }

  async update(
    id: number,
    updateRegisteredGameDto: UpdateRegisteredGameDto,
    user: User,
  ): Promise<void> {
    const cheeringTeam = await this.teamService.findOne(
      updateRegisteredGameDto.cheeringTeamId,
    );

    if (!cheeringTeam) {
      throw new NotFoundException(
        `Team with ID ${updateRegisteredGameDto.cheeringTeamId} not found`,
      );
    }

    const registeredGame = await this.registeredGameRepository.findOne({
      where: { id, user },
      relations: { cheering_team: true, game: true },
    });

    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }

    registeredGame.cheering_team = cheeringTeam;
    registeredGame.image = updateRegisteredGameDto.image;
    registeredGame.seat = updateRegisteredGameDto.seat;
    registeredGame.review = updateRegisteredGameDto.review;

    await this.registeredGameRepository.save(registeredGame);
  }

  async delete(id: number, user: User): Promise<void> {
    const result = await this.registeredGameRepository.delete({ id, user });
    if (result.affected === 0) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
  }
}
