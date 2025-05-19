import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { RegisteredGame } from '../entities/registered-game.entity';
import { RegisteredGameWithGameDto } from '../dto/internal/registered-game-with-game.dto';
import { SaveRegisteredGameDto } from '../dto/internal/save-registered-game.dto';
import { DeleteRegisteredGameDto } from '../dto/internal/delete-registered-game.dto';
import { RegisteredGameWithUserDto } from '../dto/internal/registered-game-with-user.dto';
import { UpdateRegisteredGameToEntityDto } from '../dto/internal/update-registered-game.dto';

export const REGISTERED_GAME_REPOSITORY = Symbol('REGISTERED_GAME_REPOSITORY');

export interface IRegisteredGameRepository {
  find(
    where?: FindOptionsWhere<RegisteredGame>,
    order?: FindOptionsOrder<RegisteredGame>,
  ): Promise<RegisteredGameWithGameDto[]>;
  findWithUser(
    where: FindOptionsWhere<RegisteredGame>,
  ): Promise<RegisteredGameWithUserDto[]>;
  findOne(
    where: FindOptionsWhere<RegisteredGame>,
  ): Promise<RegisteredGameWithGameDto | null>;
  insert(dto: SaveRegisteredGameDto): Promise<{ insertedId: number }>;
  save(dto: SaveRegisteredGameDto): Promise<RegisteredGame>;
  update(
    dto: UpdateRegisteredGameToEntityDto,
    id: number,
    userId: number,
  ): Promise<boolean>;
  delete(dto: DeleteRegisteredGameDto): Promise<boolean>;
  countRegisteredGames(
    where?: FindOptionsWhere<RegisteredGame>,
  ): Promise<number>;
}
