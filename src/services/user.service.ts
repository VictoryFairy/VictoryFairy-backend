import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DEFAULT_PROFILE_IMAGE } from 'src/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { User } from 'src/entities/user.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { Team } from 'src/entities/team.entity';
import { AwsS3Service } from 'src/services/aws-s3.service';
import { UserRedisService } from './user-redis.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { TermService } from './term.service';
import { CreateUserDto } from 'src/dtos/account.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly userRedisService: UserRedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly awsS3Service: AwsS3Service,
    private readonly termService: TermService,
  ) {}

  /** 레디스 연결 시 미리 저장 */
  @OnEvent(EventName.REDIS_CONNECT)
  async initCacheUsers(): Promise<void> {
    try {
      const users = await this.userRepository.find();
      if (!users.length) return;
      const userIds = [];
      const cachingPromises = users.map((user) => {
        userIds.push(user.id);
        return this.userRedisService.saveUser(user);
      });
      await Promise.all(cachingPromises);
      this.eventEmitter.emit(EventName.CACHED_USERS, userIds);
      this.logger.log('유저 정보 레디스 초기 캐싱 완료');
    } catch (error) {
      this.logger.error(`유F저 정보 레디스 초기 캐싱 실패 : ${error.message}`);
      throw error;
    }
  }

  async isExistEmail(email: string): Promise<boolean> {
    try {
      return this.userRepository.exists({ where: { email } });
    } catch (error) {
      throw new InternalServerErrorException('DB 조회 실패');
    }
  }

  async isExistNickname(nickname: string): Promise<boolean> {
    try {
      return this.userRepository.exists({ where: { nickname } });
    } catch (error) {
      throw new InternalServerErrorException('DB 조회 실패');
    }
  }

  async saveUser(dto: CreateUserDto): Promise<User> {
    try {
      const { email } = dto;
      dto.image = dto.nickname?.trim() ? dto.image : DEFAULT_PROFILE_IMAGE;
      dto.nickname = dto.nickname?.trim()
        ? dto.nickname
        : await this.generateRandomNickname();
      dto.teamId = dto.teamId || 1;

      const createdUser = await this.userRepository.save({
        email,
        nickname: dto.nickname,
        profile_image: dto.image,
        support_team: { id: dto.teamId } as Team,
      });
      createdUser.support_team = { id: dto.teamId } as Team;
      return createdUser;
    } catch (error) {
      throw new InternalServerErrorException('DB 저장 실패');
    }
  }

  async getUser(
    where: FindOptionsWhere<User>,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where,
      relations,
      select,
    });
    return user;
  }

  async changeUserProfile(
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
    user: User,
  ): Promise<User> {
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
      await this.userRedisService.saveUser(updatedUser);
      if (
        field === 'image' &&
        profile_image !== value &&
        profile_image !== DEFAULT_PROFILE_IMAGE
      ) {
        await this.awsS3Service.deleteImage({ fileUrl: profile_image });
      }
    }

    return updatedUser;
  }

  @Transactional()
  async deleteUser(user: User): Promise<void> {
    const teams = await this.teamRepository.find({ select: { id: true } });
    const { profile_image, id } = user;

    await this.userRepository.delete(id);

    runOnTransactionCommit(async () => {
      if (profile_image !== DEFAULT_PROFILE_IMAGE) {
        await this.awsS3Service.deleteImage({ fileUrl: profile_image });
      }
      await this.userRedisService.userSynchronizationTransaction(id, teams);
    });
  }

  async agreeTerm(user: User, termIds: string[]): Promise<void> {
    await this.termService.saveUserAgreedTerm(user.id, termIds);
  }

  async generateRandomNickname(): Promise<string> {
    while (true) {
      const randomNum = Math.floor(Math.random() * 10000);
      const nickname = `승리요정#${randomNum.toString().padStart(4, '0')}`;
      const exists = await this.isExistNickname(nickname);
      if (!exists) {
        return nickname;
      }
    }
  }
}
