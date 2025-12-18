import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountCoreService } from '../core/account-core.service';
import { CreateLocalUserDto } from './dto/request/req-create-local-user.dto';
import { UserRedisService } from '../core/user-redis.service';
import * as moment from 'moment';
import { LoginLocalUserDto } from './dto/request/req-login-local-user.dto';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { InsertRankInput } from 'src/modules/rank/core/types/rank.interface';
import { TermCoreService } from 'src/modules/term/core/term-core.service';
import { AwsS3Service } from 'src/infra/aws-s3/aws-s3.service';
import { TeamCoreService } from 'src/modules/team/core/team-core.service';
import { RankCoreService } from 'src/modules/rank/core/rank-core.service';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { UserWithTeamDto } from './dto/response/res-user-with-team.dto';
import { plainToInstance } from 'class-transformer';
import { CreateSocialUserDto } from './dto/request/req-create-scoial-user.dto';

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

  async loginLocalUser(dto: LoginLocalUserDto): Promise<UserWithTeamDto> {
    const { email, password } = dto;
    const user = await this.accountCoreService.findUserByEmail(email);
    const isVerified = await this.accountCoreService.verifyLocalAuth(
      user.id,
      password,
    );
    if (!isVerified) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다.');
    }
    return plainToInstance(UserWithTeamDto, user);
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
      return { user: plainToInstance(UserWithTeamDto, user), isNewUser };
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
    const insertRankInput: InsertRankInput = {
      teamId: createdUser.support_team.id,
      userId: createdUser.id,
      activeYear: moment().utc().year(),
    };
    await this.rankCoreService.insertRankIfAbsent(insertRankInput);

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
        this.logger.warn(`유저 ${createdUser.id} 캐싱 실패`, error.stack);
      }
    });
    return { user: createdUser, isNewUser };
  }

  @Transactional()
  async registerLocalUser(dto: CreateLocalUserDto): Promise<{ id: number }> {
    const { requiredTermIds } = await this.termCoreService.getRequiredTermIds();
    const createdUser = await this.accountCoreService.createLocalUser(
      dto,
      requiredTermIds,
    );
    const insertRankInput: InsertRankInput = {
      teamId: dto.teamId,
      userId: createdUser.id,
      activeYear: moment().utc().year(),
    };
    await this.rankCoreService.insertRankIfAbsent(insertRankInput);

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

  async linkSocial(dto: CreateSocialUserDto): Promise<void> {
    const { sub, provider, userId, providerEmail, isPrimary } = dto;
    await this.accountCoreService.linkSocial({
      sub,
      provider,
      userId,
      providerEmail,
      isPrimary,
    });
  }

  async unlinkSocial(dto: {
    userId: number;
    provider: SocialProvider;
  }): Promise<void> {
    const { userId, provider } = dto;
    await this.accountCoreService.unlinkSocial({ userId, provider });
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
      const { prevTeamId } =
        await this.accountCoreService.updateUserProfileTeamId(userId, value);
      const insertRankInput: InsertRankInput = {
        teamId: value,
        userId,
        activeYear: moment().utc().year(),
      };
      await this.rankCoreService.insertRankIfAbsent(insertRankInput); // 랭킹 테이블 기본 데이터 생성

      const data =
        await this.rankCoreService.aggregateRankStatsByUserId(userId);
      if (
        prevTeamId !== value &&
        data[prevTeamId] &&
        data[prevTeamId].getTotalCount() === 0
      ) {
        await this.rankCoreService.deleteRank(prevTeamId, userId);
        await this.rankingRedisService.deleteRankByUserId(userId, [prevTeamId]);
        delete data[prevTeamId];
      }
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
