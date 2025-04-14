import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DEFAULT_PROFILE_IMAGE } from 'src/modules/user/const/user.const';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/shared/const/event.const';
import { Team } from 'src/modules/team/entities/team.entity';
import { AwsS3Service } from 'src/core/aws-s3/aws-s3.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { CreateUserDto } from 'src/modules/account/account.dto';
import { UserWithSupportTeamDto } from 'src/modules/user/dto/user.dto';
import { User } from './entities/user.entity';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { TermService } from '../term/term.service';

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

  async getUserWithSupportTeamWithId(
    userId: number,
  ): Promise<UserWithSupportTeamDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { support_team: true },
      select: {
        id: true,
        email: true,
        nickname: true,
        support_team: { id: true, name: true },
      },
    });
    return user as UserWithSupportTeamDto;
  }

  async changeUserProfile(
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
    prevUserData: User,
  ): Promise<User> {
    const { field, value } = updateInput;
    switch (field) {
      case 'teamId':
        prevUserData.support_team = { id: value } as Team;
        break;
      case 'nickname':
        const isExistNickname = await this.isExistNickname(value);
        if (isExistNickname) {
          throw new ConflictException('이미 존재하는 닉네임 입니다.');
        }
        prevUserData.nickname = value;
        break;
      case 'image':
        prevUserData.profile_image = value;
        break;
      default:
        throw new BadRequestException('유효하지 않은 필드입니다.');
    }

    try {
      const updatedUser = await this.userRepository.save(prevUserData);
      return updatedUser;
    } catch (error) {
      throw new InternalServerErrorException('유저 DB 업데이트 실패');
    }
  }

  @Transactional()
  async deleteUser(userId: number): Promise<void> {
    const teams = await this.teamRepository.find({ select: { id: true } });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const { profile_image, id } = user;

    await this.userRepository.delete(id);

    runOnTransactionCommit(async () => {
      if (profile_image !== DEFAULT_PROFILE_IMAGE) {
        await this.awsS3Service.deleteImage({ fileUrl: profile_image });
      }
      await this.userRedisService.userSynchronizationTransaction(id, teams);
    });
  }

  async agreeTerm(userId: number, termIds: string[]): Promise<void> {
    const termList = await this.termService.getTermList();
    const allTermIds = [...termList.required, ...termList.optional].map(
      (term) => term.id,
    );
    const validTermIds = termIds.filter((id) => allTermIds.includes(id));

    if (validTermIds.length !== termIds.length) {
      throw new BadRequestException('유효하지 않은 약관 아이디');
    }
    await this.termService.saveUserAgreedTerm(userId, validTermIds);
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
