import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from 'src/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateUserDto, LoginUserDto } from 'src/dtos/user-dto';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async isExistEmail(email: string) {
    try {
      return this.userRepository.exists({ where: { email } });
    } catch (error) {
      throw new InternalServerErrorException('DB 조회 실패');
    }
  }

  async isExistNickname(nickname: string) {
    try {
      return this.userRepository.exists({ where: { nickname } });
    } catch (error) {
      throw new InternalServerErrorException('DB 조회 실패');
    }
  }

  async findUserById(userId: number, withEntity?: FindOptionsRelations<User>) {
    try {
      const findUser = await this.userRepository.findOne({
        where: { id: userId },
        relations: withEntity,
      });
      console.log(findUser);
      return findUser;
    } catch (error) {
      throw new InternalServerErrorException('DB<user> 조회 실패');
    }
  }

  async findUserByEmail(email: string) {
    try {
      return this.userRepository.findOne({ where: { email } });
    } catch (error) {
      throw new InternalServerErrorException('DB<user> 조회 실패');
    }
  }

  async createUser(dto: CreateUserDto) {
    const { email, image, nickname, password, teamId } = dto;

    try {
      const hashPw = await bcrypt.hash(password, HASH_ROUND);
      const result = await this.userRepository.insert({
        email,
        profile_image: image,
        support_team: { id: teamId },
        nickname,
        password: hashPw,
      });
      return { id: result.identifiers[0].id };
    } catch (error) {
      throw new InternalServerErrorException('유저 생성 실패');
    }
  }

  async changeUserPw({ email, password }: LoginUserDto) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('해당 이메일로 가입된 계정 없음');
    }
    try {
      const newHashPw = await bcrypt.hash(password, HASH_ROUND);
      const updatedUser = await this.userRepository.update(
        { id: user.id },
        { password: newHashPw },
      );
      return updatedUser;
    } catch (error) {
      throw new InternalServerErrorException('비밀번호 업데이트 실패');
    }
  }

  async changeUserProfile(
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
    user: User,
  ) {
    try {
      const { field, value } = updateInput;
      const condition: QueryDeepPartialEntity<User> = {};
      if (field === 'teamId') {
        condition.support_team = { id: value };
      } else if (field === 'image') {
        condition.profile_image = value;
      } else {
        condition[field] = value;
      }

      await this.userRepository.update({ id: user.id }, condition);
    } catch (error) {
      throw new InternalServerErrorException('유저 프로필 업데이트 실패');
    }
  }

  async deleteUser(user: User) {
    const { affected } = await this.userRepository.delete({
      id: user.id,
      email: user.email,
    });
    if (affected !== 1) {
      throw new InternalServerErrorException('DB 삭제 실패');
    }
    return { affected };
  }
}
