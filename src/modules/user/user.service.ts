import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DEFAULT_PROFILE_IMAGE } from 'src/modules/user/const/user.const';
import { FindOptionsWhere } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventName } from 'src/shared/const/event.const';
import { Team } from 'src/modules/team/entities/team.entity';
import { AwsS3Service } from 'src/core/aws-s3/aws-s3.service';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { User } from './entities/user.entity';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { TermService } from '../term/term.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from './repository/user.repository.interface';
import { CreateUserDto } from './dto/internal/create-user.dto';
import { RequiredCreateUserDto } from './dto/internal/required-create-user.dto';
import { UserWithTeamDto } from './dto/internal/user-with-team.dto';
import { UserWithLocalAuthDto } from './dto/internal/user-with-local-auth.dto';
import { DeleteUserDto } from './dto/internal/deleteone-user.dto';
import { TeamService } from '../team/team.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly userRedisService: UserRedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly awsS3Service: AwsS3Service,
    private readonly termService: TermService,
    private readonly teamService: TeamService,
  ) {}

  /** 레디스 연결 시 미리 저장 */
  @OnEvent(EventName.REDIS_CONNECT)
  async initCacheUsers(): Promise<void> {
    try {
      const users = await this.userRepo.find();
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

  async isExistEmail(email: string): Promise<{
    isExist: boolean;
    initialSignUpType: 'local' | 'social' | null;
  }> {
    const user = await this.userRepo.findOneWithLocalAuth({ email });
    const isExist = user ? true : false;
    let initialSignUpType: 'local' | 'social' | null = null;

    if (isExist) {
      initialSignUpType = user.local_auth ? 'local' : 'social';
    }

    return { isExist, initialSignUpType };
  }

  async isExistNickname(nickname: string): Promise<boolean> {
    return this.userRepo.isExist({ nickname });
  }

  async saveUser(dto: CreateUserDto): Promise<User> {
    dto.image = dto.nickname?.trim() ? dto.image : DEFAULT_PROFILE_IMAGE;
    dto.nickname = dto.nickname?.trim()
      ? dto.nickname
      : await this.generateRandomNickname();
    dto.teamId = dto.teamId || 1;

    const requiredCreateUserDto =
      await RequiredCreateUserDto.createAndValidate(dto);

    const createdUser = await this.userRepo.create(requiredCreateUserDto);
    createdUser.support_team = { id: dto.teamId } as Team;
    return createdUser;
  }

  async getUser(where: FindOptionsWhere<User>): Promise<User> {
    const user = await this.userRepo.findOne(where);
    if (!user) throw new BadRequestException('존재하지 않는 유저입니다.');
    return user;
  }

  async getUserWithSupportTeam(
    where: FindOptionsWhere<User>,
  ): Promise<UserWithTeamDto> {
    const user = await this.userRepo.findOneWithSupportTeam(where);
    if (!user) throw new BadRequestException('존재하지 않는 유저입니다.');
    return user;
  }

  async getUserWithLocalAuth(
    where: FindOptionsWhere<User>,
  ): Promise<UserWithLocalAuthDto> {
    const user = await this.userRepo.findOneWithLocalAuth(where);
    if (!user) throw new BadRequestException('존재하지 않는 유저입니다.');
    return user;
  }

  async changeUserProfile(
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
    prevUserData: UserWithTeamDto,
  ): Promise<UserWithTeamDto> {
    const { field, value } = updateInput;
    const updateData = {};
    switch (field) {
      case 'teamId':
        updateData['support_team'] = { id: value } as Team;
        break;
      case 'nickname':
        const isExistNickname = await this.isExistNickname(value);
        if (isExistNickname) {
          throw new ConflictException('이미 존재하는 닉네임 입니다.');
        }
        updateData['nickname'] = value;
        break;
      case 'image':
        updateData['profile_image'] = value;
        break;
      default:
        throw new BadRequestException('유효하지 않은 필드입니다.');
    }

    await this.userRepo.updateOne(updateData, prevUserData.id);
    const updatedUser = await this.getUserWithSupportTeam({
      id: prevUserData.id,
    });

    return updatedUser;
  }

  @Transactional()
  async deleteUser(userId: number): Promise<void> {
    const teams = await this.teamService.findAll();
    const user = await this.userRepo.findOne({ id: userId });
    const { profile_image, id } = user;

    const deleteUserDto = await DeleteUserDto.createAndValidate({ id });
    await this.userRepo.deleteOne(deleteUserDto);

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
