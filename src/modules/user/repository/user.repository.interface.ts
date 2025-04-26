import { FindOptionsWhere } from 'typeorm';
import { User } from '../entities/user.entity';
import { RequiredCreateUserDto } from '../dto/internal/required-create-user.dto';
import { DeleteUserDto } from '../dto/internal/deleteone-user.dto';
import { UserWithTeamDto } from '../dto/internal/user-with-team.dto';
import { UserWithLocalAuthDto } from '../dto/internal/user-with-local-auth.dto';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface IUserRepository {
  find(): Promise<User[]>;
  findWithSupportTeam(
    where?: FindOptionsWhere<User>,
  ): Promise<UserWithTeamDto[]>;
  findOne(where: FindOptionsWhere<User>): Promise<User | null>;
  findOneWithSupportTeam(
    where: FindOptionsWhere<User>,
  ): Promise<UserWithTeamDto | null>;
  findOneWithLocalAuth(
    where: FindOptionsWhere<User>,
  ): Promise<UserWithLocalAuthDto | null>;
  isExist(where: FindOptionsWhere<User>): Promise<boolean>;
  create(dto: RequiredCreateUserDto): Promise<User>;
  updateOne(
    data: { field: string; value: any },
    userId: number,
  ): Promise<boolean>;
  deleteOne(dto: DeleteUserDto): Promise<boolean>;
}
