import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { Repository } from 'typeorm';
import { LoginLocalUserDto } from '../dto/request/req-login-local-user.dto';
import { UserWithTeamDto } from '../dto/internal/user-with-team.dto';
import { CreateLocalUserDto } from '../dto/request/req-create-local-user.dto';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { CreateSocialAuthDto } from 'src/modules/auth/dto/internal/social-auth/create-social-auth.dto';
import { DEFAULT_PROFILE_IMAGE } from 'src/modules/account/core/const/user.const';
import { UserRedisService } from './user-redis.service';
import { EventName } from 'src/shared/const/event.const';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AccountCoreService {
  private readonly logger = new Logger(AccountCoreService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userRedisService: UserRedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** 처음 서버 시작 시 유저 프로필 미리 캐싱 */
  @OnEvent(EventName.REDIS_CONNECT)
  async initCacheUsers(): Promise<void> {
    try {
      const users = await this.userRepo.find();
      if (!users.length) return;
      const userIds = [];
      const userInfos = users.map((user) => {
        userIds.push(user.id);
        const { id, nickname, profile_image } = user;
        return { id, nickname, profile_image };
      });
      await this.userRedisService.saveUsers(userInfos);
      this.eventEmitter.emit(EventName.CACHED_USERS, userIds);
      this.logger.log('유저 정보 레디스 초기 캐싱 완료');
    } catch (error) {
      this.logger.error(`유저 정보 레디스 초기 캐싱 실패 : ${error.message}`);
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: { support_team: true, local_auth: true },
    });
    if (!user) throw new BadRequestException('존재하지 않는 유저입니다.');
    return user;
  }

  async getUserById(userId: number): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });
    return user;
  }

  async findSocialUserOrValidate(
    sub: string,
    provider: SocialProvider,
    email: string,
  ): Promise<{ user: UserWithTeamDto | null; isNewUser: boolean }> {
    const user = await this.userRepo.findOne({
      relations: { social_auths: true, support_team: true },
      where: [
        { social_auths: { sub, provider } }, // 이미 연동된 유저?
        { email: email }, // 이메일이 중복된 유저?
      ],
    });

    if (!user) {
      return { user: null, isNewUser: true };
    }

    const isLoginSuccess = user.social_auths.find(
      (auth) => auth.provider === provider && auth.sub === sub,
    );

    if (isLoginSuccess) {
      return {
        user: await UserWithTeamDto.createAndValidate(user),
        isNewUser: false,
      };
    }

    // 여기까지 왔다면, 이메일만 같은 다른 계정이 있음
    throw new ConflictException('이미 가입된 이메일입니다.');
  }

  async verifyLocalAuth(userId: number, password: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { local_auth: true },
    });
    if (!user.local_auth?.password) return false;
    const result = await user.validatePassword(password);
    return result;
  }

  async validateLocalUser(dto: LoginLocalUserDto): Promise<UserWithTeamDto> {
    const { email, password } = dto;

    const user = await this.userRepo.findOne({
      where: { email },
      relations: { support_team: true, local_auth: true },
    });

    const isVerified = await user.validatePassword(password);
    if (!isVerified) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }
    return user;
  }

  async createLocalUser(
    dto: CreateLocalUserDto,
    termIds: string[],
  ): Promise<UserWithTeamDto> {
    const { password, email, image, teamId } = dto;
    let { nickname } = dto;
    if (nickname.trim() === '' || !nickname.trim()) {
      nickname = await this.generateRandomNickname();
    }
    const createdUser = await User.createWithLocalAuth({
      email,
      image,
      nickname,
      teamId,
      password,
      termIds,
    });

    const savedUser = await this.userRepo.save(createdUser);

    const user = await this.userRepo.findOne({
      where: { id: savedUser.id },
      relations: { support_team: true },
    });
    return await UserWithTeamDto.createAndValidate(user);
  }

  async createSocialUser(
    email: string,
    sub: string,
    provider: SocialProvider,
    providerEmail: string,
    isPrimary: boolean,
    termIds: string[],
  ) {
    const newUser = await User.createWithSocialAuth({
      email,
      image: '',
      nickname: '',
      teamId: 1,
      socialAuthData: { sub, provider, providerEmail, isPrimary },
      termIds: termIds.length > 0 ? termIds : [],
    });
    const savedUser = await this.userRepo.save(newUser);
    return await this.userRepo.findOne({
      where: { id: savedUser.id },
      relations: { support_team: true },
    });
  }

  async deleteUser(userId: number): Promise<{ prevImage: string | null }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { local_auth: true, social_auths: true },
    });
    const { profile_image } = user;
    await this.userRepo.remove(user);

    return {
      prevImage: profile_image !== DEFAULT_PROFILE_IMAGE ? profile_image : null,
    };
  }

  async linkSocial(data: CreateSocialAuthDto): Promise<void> {
    const { sub, provider, userId, providerEmail, isPrimary } = data;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { social_auths: true },
    });

    user.addSocialAuth({
      sub,
      provider,
      userId,
      providerEmail,
      isPrimary,
    });
    await this.userRepo.save(user);
  }

  async unlinkSocial(data: {
    userId: number;
    provider: SocialProvider;
  }): Promise<void> {
    const { userId, provider } = data;
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { social_auths: true },
    });

    user.removeSocialAuth({ provider });
    await this.userRepo.save(user);
  }

  async getUserAgreedRequiredTerm(userId: number): Promise<string[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { user_terms: true },
    });

    const requiredTermIds = user.user_terms
      .filter((term) => term.term.is_required)
      .map((term) => term.term_id);

    if (!requiredTermIds.length) {
      return [];
    }

    return requiredTermIds;
  }

  async changePassword(email: string, password: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: { local_auth: true },
    });
    await user.changePassword(password);
    await this.userRepo.save(user);
  }

  async checkPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { local_auth: true },
    });
    return user.validatePassword(password);
  }

  async updateUserProfileImage(
    userId: number,
    imageUrl: string,
  ): Promise<{ prevImage: string | null }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { local_auth: true },
    });

    const prevImage = user.profile_image;
    user.updateProfileImage(imageUrl);
    await this.userRepo.save(user);

    if (prevImage !== imageUrl && prevImage !== DEFAULT_PROFILE_IMAGE) {
      return { prevImage };
    }
    return { prevImage: null };
  }

  async updateUserProfileNickname(
    userId: number,
    nickname: string,
  ): Promise<void> {
    const isExist = await this.userRepo.findOne({ where: { nickname } });
    if (isExist) {
      throw new ConflictException('이미 존재하는 닉네임입니다.');
    }
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { local_auth: true },
    });
    user.updateNickname(nickname);
    await this.userRepo.save(user);
  }

  async updateUserProfileTeamId(userId: number, teamId: number): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { local_auth: true },
    });
    user.updateTeam(teamId);
    await this.userRepo.save(user);
  }

  async agreeTerms(userId: number, termIds: string[]): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { user_terms: true },
    });
    user.agreeTerms(termIds);
    await this.userRepo.save(user);
  }

  async generateRandomNickname(): Promise<string> {
    let retryCount = 0;
    const MAX_RETRIES = 30;
    while (true) {
      const randomNickname = User.generateRandomNickname();
      const isExistNickname = await this.userRepo.findOne({
        where: { nickname: randomNickname },
      });
      if (!isExistNickname) {
        return randomNickname;
      }
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        throw new InternalServerErrorException('닉네임 생성 실패');
      }
    }
  }
}
