import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { RankService } from 'src/modules/rank/rank.service';
import { Transactional, runOnTransactionCommit } from 'typeorm-transactional';
import * as moment from 'moment';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { CachedTermList } from 'src/modules/term/types/term.type';
import { TermRedisService } from 'src/core/redis/term-redis.service';
import { TermService } from '../term/term.service';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { CreateSocialAuthDto } from '../auth/dto/internal/social-auth/create-social-auth.dto';
import { DEFAULT_PROFILE_IMAGE } from '../user/const/user.const';
import { AwsS3Service } from 'src/core/aws-s3/aws-s3.service';
import { DeleteSocialAuthDto } from '../auth/dto/internal/social-auth/delete-social-auth.dto';
import { UserWithTeamDto } from '../user/dto/internal/user-with-team.dto';
import { CreateUserDto } from '../user/dto/internal/create-user.dto';
import { CreateLocalUserDto } from '../user/dto/request/req-create-local-user.dto';
import { LoginLocalUserDto } from '../user/dto/request/req-login-local-user.dto';
import { InsertRankDto } from '../rank/dto/internal/insert-rank.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    private readonly termService: TermService,
    private readonly rankService: RankService,
    private readonly userRedisService: UserRedisService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly termRedisService: TermRedisService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async loginLocalUser(dto: LoginLocalUserDto): Promise<UserWithTeamDto> {
    const { email, password } = dto;
    const user = await this.userService.getUserWithSupportTeam({ email });

    const isVerified = await this.authService.verifyLocalAuth(
      user.id,
      password,
    );
    if (!isVerified) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }

    return user;
  }

  @Transactional()
  async loginSocialUser(
    sub: string,
    providerEmail: string,
    provider: SocialProvider,
  ): Promise<{ user: UserWithTeamDto; isNewUser: boolean }> {
    let isNewUser = false;
    //해당 플랫폼으로 가입된 유저 조회
    const socialAuth = await this.authService.getSocialAuth({
      sub,
      provider,
    });

    if (socialAuth) {
      const user = await this.userService.getUserWithSupportTeam({
        id: socialAuth.userId,
      });
      return { user, isNewUser };
    }

    const isExistUser = await this.userService.isExistEmail(providerEmail);

    // 동일 이메일이 이미 가입된 경우
    if (isExistUser.isExist) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }
    //없는 경우
    const createdUser = await this.createSocialUser(
      { email: providerEmail },
      { sub, provider, providerEmail, isPrimary: true },
    );
    const user = await this.userService.getUserWithSupportTeam({
      id: createdUser.id,
    });
    isNewUser = true;
    runOnTransactionCommit(async () => {
      try {
        await this.userRedisService.saveUser(createdUser);
        await this.rankService.updateRedisRankings(user.id);
      } catch (error) {
        this.logger.warn(`유저 ${user.id} 캐싱 실패`, error.stack);
      }
    });

    return { user, isNewUser };
  }

  @Transactional()
  async createLocalUser(dto: CreateLocalUserDto): Promise<{ id: number }> {
    const { password, ...userData } = dto;
    const createdUser = await this.userService.saveUser(userData);
    const insertRankDto = await InsertRankDto.createAndValidate({
      team_id: dto.teamId,
      user_id: createdUser.id,
      active_year: moment().utc().year(),
    });

    await Promise.all([
      this.authService.createLocalAuth(createdUser.id, password),
      this.rankService.insertRankIfAbsent(insertRankDto),
      this.agreeUserRequireTerm(createdUser.id),
    ]);

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

  /**
   * @description 소셜 로그인 함수 내부에서 처리
   * User생성 및 SocialAuth 생성 */
  async createSocialUser(
    userData: CreateUserDto,
    socialAuthData: Omit<CreateSocialAuthDto, 'userId'>,
  ) {
    const createdUser = await this.userService.saveUser(userData);
    const createSocialAuthDto = await CreateSocialAuthDto.createAndValidate({
      ...socialAuthData,
      userId: createdUser.id,
    });
    const insertRankDto = await InsertRankDto.createAndValidate({
      team_id: createdUser.support_team.id,
      user_id: createdUser.id,
      active_year: moment().utc().year(),
    });

    await Promise.all([
      this.authService.createSocialAuth(createSocialAuthDto),
      this.rankService.insertRankIfAbsent(insertRankDto),
      this.agreeUserRequireTerm(createdUser.id),
    ]);

    return createdUser;
  }

  /** SocialAuth 연결 */
  async linkSocial(data: CreateSocialAuthDto): Promise<void> {
    const { sub, provider } = data;
    const socialAuth = await this.authService.getSocialAuth({
      sub,
      provider,
    });

    if (socialAuth) {
      throw new ConflictException('이미 연동했거나 가입하였습니다.');
    }
    await this.authService.createSocialAuth(data);
  }

  @Transactional()
  async unlinkSocial(data: {
    userId: number;
    provider: SocialProvider;
  }): Promise<void> {
    const { userId, provider } = data;
    const isExistLocalAuth = await this.authService.getLocalAuth(userId);

    // 로컬 회원가입이면 연동 해제 후 종료
    if (isExistLocalAuth) {
      await this.authService.deleteSocialAuth({ userId, provider });
      return;
    }

    const socialAuthList =
      await this.authService.getUserWithSocialAuthList(userId);

    // 소셜 게정 회원가입이면서 연동 계정이 하나인 경우 연동 해제 불가
    if (socialAuthList.length === 1) {
      throw new BadRequestException('소셜 계정 연동 해제 불가능');
    }

    const isExistPrimarySocialAuth = socialAuthList.filter(
      (social) => social.is_primary === true,
    );
    if (isExistPrimarySocialAuth.length === 0) {
      throw new BadRequestException('소셜 계정 연동 해제 불가능');
    }
    // 소셜플랫폼 처음 회원가입 이메일은 연동 해제 불가
    if (isExistPrimarySocialAuth[0].provider === provider) {
      throw new ForbiddenException(
        '소셜플랫폼 처음 회원가입 이메일 연동 해제 불가능',
      );
    }

    const deleteSocialAuthDto = await DeleteSocialAuthDto.createAndValidate({
      userId,
      provider,
    });
    await this.authService.deleteSocialAuth(deleteSocialAuthDto);
    return;
  }

  /** 필수 약관 동의 처리 */
  async agreeUserRequireTerm(userId: number): Promise<boolean> {
    try {
      const requireTerm = await this.termService.getTermList();
      if (!requireTerm?.required?.length) {
        return true;
      }

      const requireTermIds = requireTerm.required.map((term) => term.id);
      await this.termService.saveUserAgreedTerm(userId, requireTermIds);

      return true;
    } catch (error) {
      throw new InternalServerErrorException('유저 약관 동의 실패');
    }
  }

  async checkUserAgreedRequiredTerm(
    userId: number,
  ): Promise<{ notAgreedRequiredTerms: string[] }> {
    const termList: CachedTermList = await this.termRedisService.getTermList();
    const userAgreedTermList =
      await this.termService.getUserAgreedTerms(userId);

    const agreedTermIds = new Set(userAgreedTermList);
    const notAgreedRequiredTerms = termList.required
      .filter((requiredTerm) => !agreedTermIds.has(requiredTerm.id))
      .map((term) => term.id);

    return { notAgreedRequiredTerms };
  }

  async changePassword(email: string, password: string): Promise<void> {
    const user = await this.userService.getUser({ email });

    if (!user) {
      throw new BadRequestException('해당 이메일로 가입된 계정 없음');
    }

    await this.authService.changePassword(user.id, password);
  }

  async profileUpdate(
    userId: number,
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
  ) {
    const { field, value } = updateInput;

    const prevUserData = await this.userService.getUserWithSupportTeam({
      id: userId,
    });
    const oldImage = prevUserData?.profile_image || null;
    // 유저 업데이트
    const updatedUser = await this.userService.changeUserProfile(
      updateInput,
      prevUserData,
    );

    if (field === 'image' || field === 'nickname') {
      await this.userRedisService.saveUser(updatedUser);
    }

    // 유저 프로필 업데이트 후 추가 작업 로직
    if (
      field === 'image' &&
      prevUserData.profile_image !== value &&
      oldImage !== DEFAULT_PROFILE_IMAGE
    ) {
      await this.awsS3Service.deleteImage({ fileUrl: oldImage });
    }
    if (updateInput.field === 'teamId') {
      const insertRankDto = await InsertRankDto.createAndValidate({
        team_id: updateInput.value,
        user_id: userId,
        active_year: moment().utc().year(),
      });
      await this.rankService.insertRankIfAbsent(insertRankDto);
      await this.rankService.updateRedisRankings(userId);
    }
  }
}
