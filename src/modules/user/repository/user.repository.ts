import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserWithLocalAuthDto } from '../dto/internal/user-with-local-auth.dto';
import { Team } from 'src/modules/team/entities/team.entity';
import { RequiredCreateUserDto } from '../dto/internal/required-create-user.dto';
import { UserWithTeamDto } from '../dto/internal/user-with-team.dto';
import { DeleteUserDto } from '../dto/internal/deleteone-user.dto';
import { IUserRepository } from './user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}
  async find(): Promise<User[]> {
    try {
      const result = await this.userRepo.find();
      return result;
    } catch (error) {
      throw new InternalServerErrorException('User DB 조회 실패');
    }
  }

  async findWithSupportTeam(
    where?: FindOptionsWhere<User>,
  ): Promise<UserWithTeamDto[]> {
    const result = await this.userRepo.find({
      relations: { support_team: true },
      where,
    });
    return await Promise.all(
      result.map(async (user) => await UserWithTeamDto.createAndValidate(user)),
    );
  }

  async findOneWithSupportTeam(
    where: FindOptionsWhere<User>,
  ): Promise<UserWithTeamDto | null> {
    try {
      const result = await this.userRepo.findOne({
        where,
        relations: { support_team: true },
      });
      return await UserWithTeamDto.createAndValidate(result);
    } catch (error) {
      throw new InternalServerErrorException('User DB 조회 실패');
    }
  }

  async findOne(where: FindOptionsWhere<User>): Promise<User | null> {
    try {
      const result = await this.userRepo.findOne({ where });
      return result;
    } catch (error) {
      throw new InternalServerErrorException('User DB 조회 실패');
    }
  }

  async findOneWithLocalAuth(
    where: FindOptionsWhere<User>,
  ): Promise<UserWithLocalAuthDto | null> {
    try {
      const result = await this.userRepo.findOne({
        where,
        relations: { local_auth: true },
      });

      return result
        ? await UserWithLocalAuthDto.createAndValidate(result)
        : null;
    } catch (error) {
      throw new InternalServerErrorException('User DB 조회 실패');
    }
  }

  async isExist(where: FindOptionsWhere<User>): Promise<boolean> {
    try {
      const result = await this.userRepo.exists({ where });
      return result;
    } catch (error) {
      throw new InternalServerErrorException('User DB 조회 실패');
    }
  }

  async create(dto: RequiredCreateUserDto): Promise<User> {
    try {
      const user = this.userRepo.create({
        email: dto.email,
        profile_image: dto.image,
        nickname: dto.nickname,
        support_team: { id: dto.teamId } as Team,
      });
      return this.userRepo.save(user);
    } catch (error) {
      throw new InternalServerErrorException('User DB 저장 실패');
    }
  }

  async updateOne(
    data: { field: string; value: any },
    userId: number,
  ): Promise<boolean> {
    const { field, value } = data;
    try {
      const result = await this.userRepo.update(userId, { [field]: value });
      return result.affected > 0;
    } catch (error) {
      throw new InternalServerErrorException('User DB 업데이트 실패');
    }
  }

  async deleteOne(dto: DeleteUserDto): Promise<boolean> {
    try {
      const { userId } = dto;
      const result = await this.userRepo.delete(userId);
      return result.affected > 0;
    } catch (error) {
      throw new InternalServerErrorException('User DB 삭제 실패');
    }
  }
}
