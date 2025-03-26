import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateLocalUserDto,
  LoginLocalUserDto,
  UserWithSupportTeamDto,
} from 'src/dtos/user.dto';
import { CreateSocialAuthDto, CreateUserDto } from 'src/dtos/account.dto';
import { TermService } from 'src/services/term.service';
import { UserRedisService } from 'src/services/user-redis.service';
import { RankService } from 'src/services/rank.service';
import { UserService } from 'src/services/user.service';
import { Transactional, runOnTransactionCommit } from 'typeorm-transactional';
import * as moment from 'moment';
import { AuthService } from 'src/auth/auth.service';
import { SocialProvider } from 'src/const/auth.const';
import { CachedTermList } from 'src/types/term.type';
import { TermRedisService } from 'src/services/term-redis.service';
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
  ) {}

  async loginLocalUser(dto: LoginLocalUserDto) {
    const { email, password } = dto;
    const user = await this.userService.getUser(
      { email },
      { support_team: true },
    );

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }

    const isVerified = await this.authService.verifyLocalAuth(
      user.id,
      password,
    );
    if (!isVerified) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }

    return { user };
  }

  @Transactional()
  async loginSocialUser(
    sub: string,
    providerEmail: string,
    provider: SocialProvider,
  ): Promise<{ user: UserWithSupportTeamDto; isNewUser: boolean }> {
    let isNewUser = false;
    try {
      //해당 플랫폼으로 가입된 유저 조회
      const socialAuth = await this.authService.getSocialAuth(
        { sub, provider },
        {},
        { user_id: true },
      );

      if (socialAuth) {
        const user = await this.userService.getUserWithSupportTeamWithId(
          socialAuth.user_id,
        );
        return { user, isNewUser };
      }

      const isExistUser = await this.userService.getUser(
        { email: providerEmail },
        {},
        { id: true, email: true },
      );

      // 동일 이메일이 이미 가입된 경우
      if (isExistUser) {
        throw new ConflictException('이미 가입된 이메일입니다.');
      }
      //없는 경우
      const createdUser = await this.createSocialUser(
        { email: providerEmail },
        { sub, provider, providerEmail, isPrimary: true },
      );
      const user = await this.userService.getUserWithSupportTeamWithId(
        createdUser.id,
      );
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('소셜 로그인 실패');
    }
  }

  async createLocalUser(dto: CreateLocalUserDto): Promise<{ id: number }> {
    const { password, ...userData } = dto;
    const createdUser = await this.userService.saveUser(userData);

    await Promise.all([
      this.authService.createLocalAuth(createdUser.id, password),
      this.rankService.insertRankIfAbsent({
        team_id: dto.teamId,
        year: moment().utc().year(),
        user_id: createdUser.id,
      }),
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
    userData: Pick<CreateUserDto, 'email'>,
    socialAuthData: Omit<CreateSocialAuthDto, 'userId'>,
  ) {
    const createdUser = await this.userService.saveUser(userData);

    await Promise.all([
      this.authService.createSocialAuth(socialAuthData, createdUser.id),
      this.rankService.insertRankIfAbsent({
        team_id: createdUser.support_team.id,
        user_id: createdUser.id,
        year: moment().utc().year(),
      }),
      this.agreeUserRequireTerm(createdUser.id),
    ]);

    return createdUser;
  }

  /** SocialAuth 연결 */
  async linkSocial(data: CreateSocialAuthDto) {
    const { userId, sub, provider } = data;
    const socialAuth = await this.authService.getSocialAuth({
      sub,
      provider,
    });

    if (socialAuth) {
      throw new ConflictException('이미 연동했거나 가입하였습니다.');
    }
    try {
      await this.authService.createSocialAuth(data, userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('계정 연동 실패');
    }
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
      await this.authService.deleteSocialAuth(userId, provider);
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

    await this.authService.deleteSocialAuth(userId, provider);
    return;
  }

  /** User생성 및 약관 동의까지 같이 저장*/
  async agreeUserRequireTerm(userId: number): Promise<boolean> {
    try {
      const requireTerm = await this.termService.getTermList();
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
    try {
      await this.authService.changePassword(user.id, password);
    } catch (error) {
      throw new InternalServerErrorException('비밀번호 업데이트 실패');
    }
  }

  async profileUpdate(
    userId: number,
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
  ) {
    const prevUserData = await this.userService.getUser(
      { id: userId },
      { support_team: true },
      {
        id: true,
        nickname: true,
        profile_image: true,
        support_team: { id: true },
      },
    );
    await this.userService.changeUserProfile(updateInput, prevUserData);

    if (updateInput.field === 'teamId') {
      await this.rankService.insertRankIfAbsent({
        team_id: updateInput.value,
        user_id: userId,
        year: moment().utc().year(),
      });
      await this.rankService.updateRedisRankings(userId);
    }
  }
}
