import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountCoreService } from '../core/account-core.service';
import { CreateLocalUserDto } from '../dto/request/req-create-local-user.dto';
import { UserRedisService } from '../core/user-redis.service';
import * as moment from 'moment';
import { LoginLocalUserDto } from '../dto/request/req-login-local-user.dto';
import { UserWithTeamDto } from '../dto/internal/user-with-team.dto';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { InsertRankDto } from 'src/modules/rank/dto/internal/insert-rank.dto';
import { TermCoreService } from 'src/modules/term/core/term-core.service';
import { CreateSocialAuthDto } from 'src/modules/auth/dto/internal/social-auth/create-social-auth.dto';
import { AwsS3Service } from 'src/infra/aws-s3/aws-s3.service';
import { TeamCoreService } from 'src/modules/team/core/team-core.service';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';

@Injectable()
export class AccountApplicationCommandService {
  private readonly logger = new Logger(AccountApplicationCommandService.name);
  constructor(
    private readonly accountCoreService: AccountCoreService,
    private readonly termCoreService: TermCoreService,
    private readonly userRedisService: UserRedisService,
    private readonly awsS3Service: AwsS3Service,
    private readonly teamCoreService: TeamCoreService,
    private readonly rankCoreService: RankCoreService,
    private readonly rankingRedisService: RankingRedisService,
  ) {}

  async loginLocalUser(dto: LoginLocalUserDto) {
    const { email, password } = dto;
    const user = await this.accountCoreService.findUserByEmail(email);
    const isVerified = await this.accountCoreService.verifyLocalAuth(
      user.id,
      password,
    );
    if (!isVerified) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }
    return UserWithTeamDto.createAndValidate(user);
  }

  @Transactional()
  async loginSocialUser(
    sub: string,
    providerEmail: string,
    provider: SocialProvider,
  ): Promise<{ user: UserWithTeamDto; isNewUser: boolean }> {
    // 소셜 로그인 확인 및 해당 이메일로 이미 가입했는지 여부 확인
    const { user, isNewUser } =
      await this.accountCoreService.findSocialUserOrValidate(
        sub,
        provider,
        providerEmail,
      );
    if (user && !isNewUser) {
      return { user: await UserWithTeamDto.createAndValidate(user), isNewUser };
    }

    // 없는 경우, 유저 생성
    const { requiredTermIds } = await this.termCoreService.getRequiredTermIds();
    const createdUser = await this.accountCoreService.createSocialUser(
      providerEmail,
      sub,
      provider,
      providerEmail,
      true,
      requiredTermIds,
    );

    // 유저 생성에 따른 랭킹 테이블 기본 데이터 생성
    const insertRankDto = await InsertRankDto.createAndValidate({
      team_id: createdUser.support_team.id,
      user_id: createdUser.id,
      active_year: moment().utc().year(),
    });
    await this.rankCoreService.insertRankIfAbsent(insertRankDto);

    // 유저 생성으로 유저 프로필, 랭킹 레디스 캐싱
    runOnTransactionCommit(async () => {
      try {
        const { id, nickname, profile_image } = createdUser;
        await this.userRedisService.saveUsers([
          { id, nickname, profile_image },
        ]);
        const data = await this.rankCoreService.aggregateRankStatsByUserId(id);
        await this.rankingRedisService.updateRankings(id, data);
      } catch (error) {
        this.logger.warn(`유저 ${user.id} 캐싱 실패`, error.stack);
      }
    });
    return {
      user: await UserWithTeamDto.createAndValidate(createdUser),
      isNewUser,
    };
  }

  @Transactional()
  async registerLocalUser(dto: CreateLocalUserDto): Promise<{ id: number }> {
    const { requiredTermIds } = await this.termCoreService.getRequiredTermIds();
    const createdUser = await this.accountCoreService.createLocalUser(
      dto,
      requiredTermIds,
    );
    const insertRankDto = await InsertRankDto.createAndValidate({
      team_id: dto.teamId,
      user_id: createdUser.id,
      active_year: moment().utc().year(),
    });
    await this.rankCoreService.insertRankIfAbsent(insertRankDto);

    runOnTransactionCommit(async () => {
      const { id, nickname, profile_image } = createdUser;
      try {
        await this.userRedisService.saveUsers([
          { id, nickname, profile_image },
        ]);
        const data = await this.rankCoreService.aggregateRankStatsByUserId(
          createdUser.id,
        );
        await this.rankingRedisService.updateRankings(createdUser.id, data);
      } catch (error) {
        this.logger.warn(`유저 ${createdUser.id} 캐싱 실패`, error.stack);
      }
    });

    return { id: createdUser.id };
  }

  @Transactional()
  async deleteUser(userId: number): Promise<void> {
    const teams = await this.teamCoreService.findAll();
    const { prevImage } = await this.accountCoreService.deleteUser(userId);
    if (prevImage) {
      await this.awsS3Service.deleteImage({ fileUrl: prevImage });
    }
    const teamIds = teams.map((team) => team.id);

    // 유저 프로필, 랭킹 캐싱 삭제
    await this.userRedisService.deleteUser(userId);
    await this.rankingRedisService.deleteRankByUserId(userId, teamIds);
  }

  async linkSocial(data: CreateSocialAuthDto): Promise<void> {
    await this.accountCoreService.linkSocial(data);
  }

  async unlinkSocial(data: {
    userId: number;
    provider: SocialProvider;
  }): Promise<void> {
    await this.accountCoreService.unlinkSocial(data);
  }

  async changePassword(dto: LoginLocalUserDto): Promise<void> {
    const { email, password } = dto;
    await this.accountCoreService.changePassword(email, password);
  }

  async checkPassword(userId: number, password: string): Promise<boolean> {
    const result = await this.accountCoreService.checkPassword(
      userId,
      password,
    );
    return result;
  }

  async updateUserProfile(
    userId: number,
    updateInput: { field: 'teamId' | 'image' | 'nickname'; value: any },
  ): Promise<void> {
    const { field, value } = updateInput;
    if (field === 'image') {
      const { prevImage } =
        await this.accountCoreService.updateUserProfileImage(userId, value);
      if (prevImage) {
        await this.awsS3Service.deleteImage({ fileUrl: prevImage });
        // 유저 레디스 프로필 캐싱
      }
      await this.userRedisService.updateFieldsOfUser(userId, {
        field: 'profileImage',
        value,
      });
      return;
    }

    if (field === 'nickname') {
      await this.accountCoreService.updateUserProfileNickname(userId, value);
      // 유저 레디스 프로필 캐싱
      await this.userRedisService.updateFieldsOfUser(userId, {
        field: 'nickname',
        value,
      });
      return;
    }

    if (field === 'teamId') {
      await this.accountCoreService.updateUserProfileTeamId(userId, value);
      const insertRankDto = await InsertRankDto.createAndValidate({
        team_id: value,
        user_id: userId,
        active_year: moment().utc().year(),
      });
      await this.rankCoreService.insertRankIfAbsent(insertRankDto); // 랭킹 테이블 기본 데이터 생성
      const data =
        await this.rankCoreService.aggregateRankStatsByUserId(userId);
      await this.rankingRedisService.updateRankings(userId, data);
      return;
    }
    throw new BadRequestException('유효하지 않은 필드입니다.');
  }

  async agreeTerm(userId: number, termIds: string[]): Promise<void> {
    const termList = await this.termCoreService.getTermList();
    const allTermIds = [...termList.required, ...termList.optional].map(
      (term) => term.id,
    );
    const validTermIds = termIds.filter((id) => allTermIds.includes(id));

    if (validTermIds.length !== termIds.length) {
      throw new BadRequestException('유효하지 않은 약관 아이디');
    }
    await this.accountCoreService.agreeTerms(userId, validTermIds);
  }
}
