import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from 'src/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, FindOptionsSelect, Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateUserDto, LoginUserDto } from 'src/dtos/user-dto';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Redis } from 'ioredis';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  async initCacheUsers() {
    try {
      const users = await this.userRepository.find();
      const cachingPromises = users.map((user) => this.cachingUser(user.id));
      await Promise.all(cachingPromises);
    } catch (error) {
      this.logger.error(
        `redis userInfo warming failed : ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('redis userInfo warming failed');
    }
  }

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

  async findUserById(
    userId: number,
    withEntity?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ) {
    try {
      const findUser = await this.userRepository.findOne({
        where: { id: userId },
        select,
        relations: withEntity,
      });
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
      const createdUserId = result.identifiers[0].id;
      //redis caching
      await this.cachingUser(createdUserId);
      return { id: createdUserId };
    } catch (error) {
      this.logger.error(`유저 생성 실패 : ${error.message}`, error.stack);
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
      // redis caching
      if (field === 'image' || field === 'nickname') {
        await this.cachingUser(user.id);
      }
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
    // redis caching 동기화
    await this.redisClient.hdel('userInfo', user.id.toString());
    return { affected };
  }

  // --------------------- redis 관련 ------------------------
  async cachingUser(id: number) {
    const userInfo = await this.findUserById(
      id,
      {},
      {
        id: true,
        nickname: true,
        profile_image: true,
      },
    );
    try {
      const cached = await this.redisClient.hset(
        'userInfo',
        userInfo.id.toString(),
        JSON.stringify(userInfo),
      );
      return cached;
    } catch (error) {
      throw new InternalServerErrorException('Redis userInfo 캐싱 실패');
    }
  }

  async getCachedUsers() {
    const userInfo = await this.redisClient.hgetall('userInfo');
    const cachedUsers = Object.entries(userInfo).reduce(
      (acc, [id, userInfoString]) => {
        acc[parseInt(id)] = JSON.parse(userInfoString);
        return acc;
      },
      {},
    );
    return cachedUsers;
  }
}
