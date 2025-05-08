import { InjectRepository } from '@nestjs/typeorm';
import { RegisteredGame } from '../entities/registered-game.entity';
import { FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RegisteredGameWithGameDto } from '../dto/internal/registered-game-with-game.dto';
import { SaveRegisteredGameDto } from '../dto/internal/save-registered-game.dto';
import { IRegisteredGameRepository } from './registered-game.repository.interface';
import { DeleteRegisteredGameDto } from '../dto/internal/delete-registered-game.dto';
import { RegisteredGameWithUserDto } from '../dto/internal/registered-game-with-user.dto';
import { UpdateRegisteredGameToEntityDto } from '../dto/internal/update-registered-game.dto';

@Injectable()
export class RegisteredGameRepository implements IRegisteredGameRepository {
  constructor(
    @InjectRepository(RegisteredGame)
    private registeredGameRepository: Repository<RegisteredGame>,
  ) {}

  async find(
    where?: FindOptionsWhere<RegisteredGame>,
    order?: FindOptionsOrder<RegisteredGame>,
  ): Promise<RegisteredGameWithGameDto[]> {
    try {
      const result = await this.registeredGameRepository.find({
        where,
        relations: {
          cheering_team: true,
          game: {
            home_team: true,
            away_team: true,
            stadium: true,
            winning_team: true,
          },
        },
        order,
      });

      const registeredGameWithGameDtos = await Promise.all(
        result.map(async (registeredGame) => {
          return await RegisteredGameWithGameDto.createAndValidate(
            registeredGame,
          );
        }),
      );

      return registeredGameWithGameDtos;
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB find 실패`);
    }
  }
  async findWithUser(
    where: FindOptionsWhere<RegisteredGame>,
  ): Promise<RegisteredGameWithUserDto[]> {
    try {
      const result = await this.registeredGameRepository.find({
        where,
        relations: {
          cheering_team: true,
          game: {
            home_team: true,
            away_team: true,
            stadium: true,
            winning_team: true,
          },
          user: true,
        },
      });
      const registeredGameWithUserDtos = await Promise.all(
        result.map(async (registeredGame) => {
          return await RegisteredGameWithUserDto.createAndValidate(
            registeredGame,
          );
        }),
      );
      return registeredGameWithUserDtos;
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB findWithUser 실패`);
    }
  }

  async findOne(
    where: FindOptionsWhere<RegisteredGame>,
  ): Promise<RegisteredGameWithGameDto | null> {
    let foundOne: RegisteredGame;
    try {
      foundOne = await this.registeredGameRepository.findOne({
        where,
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
      if (!foundOne) return null;

      const registeredGameWithGameDto =
        await RegisteredGameWithGameDto.createAndValidate(foundOne);

      return registeredGameWithGameDto;
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB findOne 실패`);
    }
  }

  async insert(dto: SaveRegisteredGameDto): Promise<{ insertedId: number }> {
    try {
      const { image, seat, review, game, cheering_team, user, status } = dto;
      const result = await this.registeredGameRepository.insert({
        image,
        seat,
        review,
        status,
        game: { id: game.id },
        cheering_team: { id: cheering_team.id },
        user: { id: user.id },
      });
      return { insertedId: result.identifiers[0].id };
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB insert 실패`);
    }
  }

  async save(dto: SaveRegisteredGameDto): Promise<RegisteredGame> {
    try {
      const { image, seat, review, game, cheering_team, user, status } = dto;
      const result = await this.registeredGameRepository.save({
        image,
        seat,
        review,
        status,
        game: { id: game.id },
        cheering_team: { id: cheering_team.id },
        user: { id: user.id },
      });
      return result;
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB save 실패`);
    }
  }

  async update(
    dto: UpdateRegisteredGameToEntityDto,
    id: number,
    userId: number,
  ) {
    try {
      const { cheeringTeam, ...rest } = dto;
      const result = await this.registeredGameRepository.update(
        { id, user: { id: userId } },
        { ...rest, cheering_team: cheeringTeam },
      );
      return result.affected > 0;
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB update 실패`);
    }
  }

  async delete(dto: DeleteRegisteredGameDto) {
    try {
      const { gameId } = dto;
      const result = await this.registeredGameRepository.delete({
        id: gameId,
      });
      return result.affected > 0;
    } catch (error) {
      throw new InternalServerErrorException(`직관 등록 DB delete 실패`);
    }
  }
}
