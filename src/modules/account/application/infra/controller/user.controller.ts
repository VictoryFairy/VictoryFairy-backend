import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Patch,
  Delete,
  Get,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CreateLocalUserDto } from '../../../dto/request/req-create-local-user.dto';
import { LoginLocalUserDto } from '../../../dto/request/req-login-local-user.dto';
import { EmailDto } from '../../../dto/request/req-email-user.dto';
import { NicknameDto } from '../../../dto/request/req-nickname-user-dto';
import { PatchUserProfileDto } from '../../../dto/request/req-patch-user-profile.dto';
import { UserMyPageDto } from '../../../dto/response/res-user-mypage.dto';
import { ResCheckPwDto } from '../../../dto/response/res-check-pw-dto';
import { TermAgreementDto } from 'src/modules/term/dto/request/term-argreement.dto';
import { ResOverallOppTeamDto } from 'src/modules/rank/dto/response/res-overall-opp-team.dto';
import { IDotenv } from 'src/config/dotenv.interface';
import { AccountApplicationQueryService } from '../../account-application.query.service';
import { AccountApplicationCommandService } from '../../account-application.command.service';

@ApiTags('User')
@Controller('users')
export class UserController {
  private readonly nodeEnv: string;
  constructor(
    private readonly accountApplicationQueryService: AccountApplicationQueryService,
    private readonly accountApplicationCommandService: AccountApplicationCommandService,
    private readonly configService: ConfigService<IDotenv>,
  ) {
    this.nodeEnv = this.configService.get('NODE_ENV', {
      infer: true,
    });
  }

  /** 유저 회원가입 */
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: CreateLocalUserDto, description: '회원가입에 필요한 정보' })
  @ApiCreatedResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 유저 저장 실패한 경우' })
  async signUp(@Body() body: CreateLocalUserDto) {
    console.log('body', body);
    await this.accountApplicationCommandService.registerLocalUser(body);
  }

  /** 이메일 중복 확인 */
  @Post('existed-email')
  @ApiOperation({ summary: '이메일 중복 확인' })
  @ApiOkResponse({
    schema: {
      properties: {
        isExist: { type: 'boolean' },
        initialSignUpType: { type: 'string', enum: ['social', 'local'] },
      },
    },
    description:
      '없는 경우 false, initialSignUpType의 경우 최초 가입 유형. 소셜 플랫폼 최초 가입된 계정과 같은 이메일로 로컬 회원가입은 안되는 점 확인해주세요',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 문제인 경우' })
  async checkUserEmail(@Body() body: EmailDto) {
    const { email } = body;
    const result =
      await this.accountApplicationQueryService.isExistEmail(email);
    return result;
  }

  /** 닉네임 중복 확인 */
  @Post('existed-nickname')
  @ApiOperation({ summary: '닉네임 중복 확인' })
  @ApiOkResponse({
    schema: { properties: { isExist: { type: 'boolean' } } },
    description: '없는 경우 false',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 문제인 경우' })
  async checkUserNick(@Body() body: NicknameDto) {
    const { nickname } = body;
    const isExist =
      await this.accountApplicationQueryService.isExistNickname(nickname);
    return { isExist };
  }

  @Post('password/check')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('access')
  @ApiOperation({ summary: '유저가 제출한 비밀번호가 맞는지 확인' })
  @ApiBody({ schema: { properties: { password: { type: 'string' } } } })
  @ApiOkResponse({
    description: '비밀번호 확인 결과를 반환. 틀린 경우 isCorrect : false',
    content: { 'application/json': { examples: ResCheckPwDto.getExamples() } },
  })
  async checkPassword(
    @CurrentUser('id') userId: number,
    @Body() body: Pick<LoginLocalUserDto, 'password'>,
  ): Promise<{ isCorrect: boolean }> {
    const { password } = body;
    const isCorrect = await this.accountApplicationCommandService.checkPassword(
      userId,
      password,
    );
    return { isCorrect };
  }

  /** 비밀번호 변경 , 프로필과 따로 뺀 이유 : 이메일 인증 코드 확인 후 변경 */
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiForbiddenResponse({
    description: '소셜플랫폼으로 최초 가입한 계정이 비밀번호 변경하려는 경우',
  })
  @ApiBadRequestResponse({
    description: '해당 이메일로 가입된 계정이 없는 경우',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패' })
  async resetPw(@Body() body: LoginLocalUserDto) {
    await this.accountApplicationCommandService.changePassword(body);
  }

  /** 유저 프로필 변경 */
  @Patch('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @JwtAuth('access')
  @ApiOperation({ summary: '프로필 변경' })
  @ApiBody({
    description: '사용자 프로필의 특정 필드를 업데이트합니다.',
    type: PatchUserProfileDto,
    examples: PatchUserProfileDto.getExample(),
  })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiConflictResponse({
    description: '이미 존재하는 닉네임으로 수정하려는 경우',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패한 경우' })
  async updateUserProfile(
    @Body() body: PatchUserProfileDto,
    @CurrentUser('id') userId: number,
  ): Promise<void> {
    await this.accountApplicationCommandService.updateUserProfile(userId, body);
  }

  /** 해당 유저의 상대 팀 전적 및 승리 중 홈 비율 기록 */
  @Get('me/versus-record')
  @JwtAuth('access')
  @ApiOkResponse({
    type: ResOverallOppTeamDto,
    description: 'oppTeam의 key는 팀의 아이디',
  })
  @ApiOperation({ summary: '해당 유저의 상대 팀 전적 및 승리 중 홈 비율 기록' })
  async getUserStats(@CurrentUser('id') userId: number) {
    const result =
      await this.accountApplicationQueryService.getUserVersusTeamStats(userId);
    return plainToInstance(ResOverallOppTeamDto, result);
  }

  /** 해당 유저의 간단한 정보와 직관 전적 가져오기 */
  @Get('me')
  @JwtAuth('access')
  @ApiOperation({ summary: '해당 유저의 간단한 정보와 직관 전적 가져오기' })
  @ApiOkResponse({
    type: UserMyPageDto,
    description: 'primaryProvider가 없는 경우 null',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 문제인 경우' })
  async getUserInfo(@CurrentUser('id') userId: number): Promise<UserMyPageDto> {
    const result =
      await this.accountApplicationQueryService.getUserMyPageInfo(userId);
    return result;
  }

  /** 회원 탈퇴 */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @JwtAuth('access')
  @ApiOperation({ summary: '회원탈퇴' })
  @ApiNoContentResponse({ description: '삭제 성공한 경우 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 삭제 실패한 경우' })
  async deleteUser(@CurrentUser('id') userId: number, @Res() res: Response) {
    await this.accountApplicationCommandService.deleteUser(userId);
    res.clearCookie('token', {
      maxAge: 0,
      httpOnly: true,
      secure: this.nodeEnv === 'production' || this.nodeEnv === 'staging',
      sameSite: this.nodeEnv === 'staging' ? 'none' : 'lax',
    });
    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @Post('term/agreement')
  @JwtAuth('access')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '약관 동의' })
  @ApiBody({ type: TermAgreementDto })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패한 경우' })
  async agreeTerm(
    @CurrentUser('id') userId: number,
    @Body() body: TermAgreementDto,
  ) {
    const { termIds } = body;

    await this.accountApplicationCommandService.agreeTerm(userId, termIds);
  }
}
