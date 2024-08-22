import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from 'src/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOptionsRelations,
  FindOptionsSelect,
  Repository,
} from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateUserDto, LoginUserDto } from 'src/dtos/user.dto';
import { Redis } from 'ioredis';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { RedisKeys } from 'src/const/redis.const';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import { Team } from 'src/entities/team.entity';
import { RankService } from './rank.service';
import { Rank } from 'src/entities/rank.entity';
import * as moment from 'moment';
import { AwsS3Service } from 'src/services/aws-s3.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRedisClient()
    private readonly redisClient: Redis,
    private readonly eventEmitter: EventEmitter2,
    private readonly rankService: RankService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  /** 레디스 연결 시 미리 저장 */
  @OnEvent(EventName.REDIS_CONNECT)
  async initCacheUsers() {
    try {
      const users = await this.userRepository.find();
      const userIds = [];
      const cachingPromises = users.map((user) => {
        userIds.push(user.id);
        return this.cachingUser(user);
      });
      await Promise.all(cachingPromises);
      this.eventEmitter.emit(EventName.CACHED_USERS, userIds);
      this.logger.log('유저 정보 레디스 초기 캐싱 완료');
    } catch (error) {
      this.logger.error(`유저 정보 레디스 초기 캐싱 실패 : ${error.message}`);
      throw new InternalServerErrorException('유저 정보 레디스 초기 캐싱 실패');
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

  async createUser(dto: CreateUserDto, qrManager: EntityManager) {
    const { email, image, nickname, password, teamId } = dto;

    try {
      const hashPw = await bcrypt.hash(password, HASH_ROUND);
      const createdUser = await qrManager.getRepository(User).save({
        email,
        profile_image: image,
        support_team: { id: teamId },
        nickname,
        password: hashPw,
      });

      //Redis caching
      await this.cachingUser(createdUser);

      // Rank table 업데이트
      await qrManager.getRepository(Rank).insert({
        team_id: teamId,
        active_year: moment().utc().year(),
        user: createdUser,
      });
      // Redis Rank caching
      await this.rankService.updateRedisRankings(createdUser.id, qrManager);

      return { id: createdUser.id };
    } catch (error) {
      throw new InternalServerErrorException('유저 생성 실패');
    }
  }

  async checkUserPw(user: User, password) {
    const isVerifiedPw = await bcrypt.compare(password, user.password);
    return isVerifiedPw;
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
      if (field === 'teamId') {
        user.support_team = { id: value } as Team;
      } else if (field === 'image') {
        user.profile_image = value;
      } else {
        user[field] = value;
      }

      const updatedUser = await this.userRepository.save(user);

      if (field === 'image' || field === 'nickname') {
        // redis caching
        await this.cachingUser(updatedUser);
        if (field === 'image') {
          // s3 이미지 삭제
          await this.awsS3Service.deleteImage({ fileUrl: user.profile_image });
        }
      }

      return updatedUser; // 필요한 경우 업데이트된 결과 반환
    } catch (error) {
      throw new InternalServerErrorException('유저 프로필 업데이트 실패');
    }
  }

  async deleteUser(user: User) {
    const { affected } = await this.userRepository.delete({
      id: user.id,
      email: user.email,
    });
    // s3 이미지 삭제
    await this.awsS3Service.deleteImage({ fileUrl: user.profile_image });
    if (affected !== 1) {
      throw new InternalServerErrorException('유저 삭제 실패');
    }
    // redis caching 동기화
    await this.redisClient.hdel(RedisKeys.USER_INFO, user.id.toString());
    return { affected };
  }

  // --------------------- redis 관련 ------------------------
  async cachingUser(user: User) {
    const { id, nickname, profile_image } = user;
    const userInfo = { id, nickname, profile_image };
    try {
      const cached = await this.redisClient.hset(
        RedisKeys.USER_INFO,
        userInfo.id.toString(),
        JSON.stringify(userInfo),
      );
      return cached;
    } catch (error) {
      throw new InternalServerErrorException('Redis userInfo 캐싱 실패');
    }
  }

  async getCachedUsers() {
    const userInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
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
