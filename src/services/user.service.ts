import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from 'src/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, FindOptionsSelect, Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateUserDto, LoginUserDto } from 'src/dtos/user.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { Team } from 'src/entities/team.entity';
import { RankService } from './rank.service';
import * as moment from 'moment';
import { AwsS3Service } from 'src/services/aws-s3.service';
import { RedisCachingService } from './redis-caching.service';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly eventEmitter: EventEmitter2,
    private readonly rankService: RankService,
    private readonly awsS3Service: AwsS3Service,
    private readonly redisCachingService: RedisCachingService,
  ) {}

  /** 레디스 연결 시 미리 저장 */
  @OnEvent(EventName.REDIS_CONNECT)
  async initCacheUsers() {
    try {
      const users = await this.userRepository.find();
      const userIds = [];
      const cachingPromises = users.map((user) => {
        userIds.push(user.id);
        return this.redisCachingService.saveUser(user);
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

  @Transactional()
  async createUser(dto: CreateUserDto) {
    try {
      const { email, password, teamId } = dto;
      let { image, nickname } = dto;
      if (!image || image.trim() === '') {
        image =
          'https://sngyo-image.s3.ap-northeast-2.amazonaws.com/fairyImg/0.png';
      }

      if (!nickname || nickname.trim() === '') {
        let isExist = true;
        let randomNum: number;
        while (isExist) {
          randomNum = Math.floor(Math.random() * 10000);

          nickname = `승리요정#${randomNum.toString().padStart(4, '0')}`;
          isExist = await this.isExistNickname(nickname);
        }
      }

      const hashPw = await bcrypt.hash(password, HASH_ROUND);
      const createdUser = await this.userRepository.save({
        email,
        profile_image: image,
        support_team: { id: teamId },
        nickname,
        password: hashPw,
      });

      //Redis caching
      await this.redisCachingService.saveUser(createdUser);

      // Rank table 업데이트
      await this.rankService.initialSave({
        team_id: teamId,
        year: moment().utc().year(),
        user_id: createdUser.id,
      });
      // Redis Rank caching
      await this.rankService.updateRedisRankings(createdUser.id);

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
      const { profile_image } = user;
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
        await this.redisCachingService.saveUser(updatedUser);
        if (field === 'image' && profile_image !== value) {
          // s3 이미지 삭제
          await this.awsS3Service.deleteImage({ fileUrl: profile_image });
        }
      }

      return updatedUser; // 필요한 경우 업데이트된 결과 반환
    } catch (error) {
      throw new InternalServerErrorException('유저 프로필 업데이트 실패');
    }
  }

  @Transactional()
  async deleteUser(user: User) {
    const teams = await this.teamRepository.find({ select: { id: true } });
    const { profile_image, id, email } = user;

    const { affected } = await this.userRepository.delete({ id, email });
    // s3 이미지 삭제
    await this.awsS3Service.deleteImage({ fileUrl: profile_image });

    await this.redisCachingService.userSynchronizationTransaction(id, teams);

    return { affected };
  }
}
