import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRegisteredGameDto, RegisteredGameDto, UpdateRegisteredGameDto } from 'src/dtos/registered-game.dto';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { User } from 'src/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { TeamService } from './team.service';
import { GameService } from './game.service';

@Injectable()
export class RegisteredGameService {
  constructor(
    @InjectRepository(RegisteredGame)
    private readonly registeredGameRepository: Repository<RegisteredGame>,
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
  ) {}

  async create(createRegisteredGameDto: CreateRegisteredGameDto, user: User): Promise<RegisteredGameDto> {
    const game = await this.gameService.findOne(createRegisteredGameDto.gameId);
    const cheeringTeam = await this.teamService.findOne(createRegisteredGameDto.cheeringTeamId);

    const registeredGame = this.registeredGameRepository.create({
      ...createRegisteredGameDto,
      game,
      cheering_team: cheeringTeam,
      user,
    });

    await this.registeredGameRepository.save(registeredGame);

    return plainToInstance(RegisteredGameDto, registeredGame, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(user: User): Promise<RegisteredGameDto[]> {
    const registeredGames = await this.registeredGameRepository.find({ where: { user } });
    return plainToInstance(RegisteredGameDto, registeredGames);
  }

  async findOne(id: number, user: User): Promise<RegisteredGameDto> {
    const registeredGame = await this.registeredGameRepository.findOne({ where: { id, user } });
    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
    return plainToInstance(RegisteredGameDto, registeredGame);
  }

  async update(id: number, updateRegisteredGameDto: UpdateRegisteredGameDto, user: User): Promise<void> {
    const registeredGame = await this.registeredGameRepository.findOne({ where: { id, user } });
    if (!registeredGame) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
    await this.registeredGameRepository.update(id, updateRegisteredGameDto);
  }

  async delete(id: number, user: User): Promise<void> {
    const result = await this.registeredGameRepository.delete({ id, user });
    if (result.affected === 0) {
      throw new NotFoundException(`Registered game with ID ${id} not found`);
    }
  }
}
