import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { RegisteredGame } from '../entities/registered-game.entity';
import { RegisteredGameWithGameDto } from '../dto/internal/registerd-game-with-game.dto';
import { UpdateRegisteredGameDto } from '../dto/request/req-update-registered-game.dto';
import { SaveRegisteredGameDto } from '../dto/internal/save-registered-game.dto';
import { DeleteRegisteredGameDto } from '../dto/internal/delete-registered-game.dto';
import { RegisteredGameWithUserDto } from '../dto/internal/registered-game-with-user.dto';

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
  ): Promise<RegisteredGameWithGameDto>;
  insert(dto: SaveRegisteredGameDto): Promise<{ insertedId: number }>;
  save(dto: SaveRegisteredGameDto): Promise<RegisteredGame>;
  update(
    dto: UpdateRegisteredGameDto,
    id: number,
    userId: number,
  ): Promise<boolean>;
  delete(dto: DeleteRegisteredGameDto): Promise<boolean>;
}
