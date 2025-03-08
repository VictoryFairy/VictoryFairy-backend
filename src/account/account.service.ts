import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from 'src/entities/user.entity';
import { CreateLocalUserDto, LoginLocalUserDto } from 'src/dtos/user.dto';
import { CreateSocialAuthDto, CreateUserDto } from 'src/dtos/account.dto';
import { TermService } from 'src/services/term.service';
import { UserRedisService } from 'src/services/user-redis.service';
import { RankService } from 'src/services/rank.service';
import { UserService } from 'src/services/user.service';
import { Transactional, runOnTransactionCommit } from 'typeorm-transactional';
import * as moment from 'moment';
import { AuthService } from 'src/auth/auth.service';
import {
  SocialLinkStatus,
  SocialLoginStatus,
  SocialProvider,
} from 'src/const/auth.const';
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
  async loginSocialUser(sub: string, email: string, provider: SocialProvider) {
    let user: User | null;
    let status: SocialLoginStatus = SocialLoginStatus.LOGIN;

    try {
      const socialAuth = await this.authService.getSocialAuth(
        { sub, provider },
        { user: true },
        { user: { id: true, email: true } },
      );
      user = socialAuth?.user ?? null;

      if (!user) {
        const isExistUser = await this.userService.getUser(
          { email },
          {},
          { id: true, email: true },
        );
        // 동일 이메일이 이미 가입된 경우
        if (isExistUser) {
          status = SocialLoginStatus.DUPLICATE;
          return { user: isExistUser, status };
        }
        //없는 경우
        user = await this.createSocialUser({ email }, { sub, provider });
        status = SocialLoginStatus.SIGNUP;
        runOnTransactionCommit(async () => {
          try {
            await this.userRedisService.saveUser(user);
            await this.rankService.updateRedisRankings(user.id);
          } catch (error) {
            this.logger.warn(`유저 ${user.id} 캐싱 실패`, error.stack);
          }
        });
      }
      return { user, status };
    } catch (error) {
      this.logger.error('Social login or signup failed');
      return { user, status: SocialLoginStatus.FAIL };
    }
  }

  @Transactional()
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
    await this.agreeUserRequireTerm(createdUser.id);

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
    socialAuthData: Omit<CreateSocialAuthDto, 'user_id'>,
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
    const { user_id, sub, provider } = data;
    const socialAuth = await this.authService.getSocialAuth({
      sub,
      provider,
      user_id,
    });
    if (socialAuth) {
      return { status: SocialLinkStatus.DUPLICATE };
    }
    const result = await this.authService.createSocialAuth(data, user_id);

    return {
      status: result ? SocialLinkStatus.SUCCESS : SocialLinkStatus.FAIL,
    };
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
