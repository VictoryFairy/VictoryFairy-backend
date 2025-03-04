import { Injectable, Logger } from '@nestjs/common';
import { DEFAULT_PROFILE_IMAGE } from 'src/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateLocalUserDto, LoginLocalUserDto } from 'src/dtos/user.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/const/event.const';
import { Team } from 'src/entities/team.entity';
import { RankService } from './rank.service';
import * as moment from 'moment';
import { AwsS3Service } from 'src/services/aws-s3.service';
import { UserRedisService } from './user-redis.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { AccountService } from 'src/account/account.service';
import { TermService } from './term.service';
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
    private readonly rankService: RankService,
    private readonly awsS3Service: AwsS3Service,
    private readonly accountService: AccountService,
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
      this.logger.error(`유저 정보 레디스 초기 캐싱 실패 : ${error.message}`);
      throw error;
    }
  }

  async isExistEmail(email: string): Promise<boolean> {
    return this.accountService.isExistEmail(email);
  }

  async isExistNickname(nickname: string): Promise<boolean> {
    return this.accountService.isExistNickname(nickname);
  }

  @Transactional()
  async createLocalUser(dto: CreateLocalUserDto): Promise<{ id: number }> {
    const createdUser = await this.accountService.createLocalUser(dto);

    // Rank table 업데이트
    await this.rankService.initialSave({
      team_id: dto.teamId,
      year: moment().utc().year(),
      user_id: createdUser.id,
    });

    runOnTransactionCommit(async () => {
      try {
        await this.userRedisService.saveUser(createdUser);
        await this.rankService.updateRedisRankings(createdUser.id);
      } catch (error) {
        this.logger.warn(`유저 ${createdUser.id} 캐싱 실패`, error.stack);
      }
    });

    return { id: createdUser.id };
  }

  async checkUserPw(user: User, password: string): Promise<boolean> {
    return this.accountService.verifyLocalAuth(user.id, password);
  }

  async changeUserPw({ email, password }: LoginLocalUserDto): Promise<void> {
    await this.accountService.changePassword(email, password);
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

    const updatedUser = await this.accountService.updateUser(user);

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

    await this.accountService.deleteUser(id);

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
}
