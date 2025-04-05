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
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/modules/account/account.service';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { UserDeco } from 'src/common/decorators/user.decorator';
import { OverallOppTeamDto } from 'src/modules/rank/dto/rank.dto';
import {
  CreateLocalUserDto,
  EmailDto,
  LoginLocalUserDto,
  NicknameDto,
  PatchUserProfileDto,
  ResCheckPwDto,
  TermAgreeDto,
  UserMyPageDto,
  UserMeResDto,
} from 'src/modules/user/dto/user.dto';
import { RankService } from 'src/modules/rank/rank.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly rankService: RankService,
    private readonly configService: ConfigService,
  ) {}

  /** 유저 회원가입 */
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: CreateLocalUserDto, description: '회원가입에 필요한 정보' })
  @ApiCreatedResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 유저 저장 실패한 경우' })
  async signUp(@Body() body: CreateLocalUserDto) {
    await this.accountService.createLocalUser(body);
  }

  /** 이메일 중복 확인 */
  @Post('existed-email')
  @ApiOperation({ summary: '이메일 중복 확인' })
  @ApiOkResponse({
    schema: { properties: { isExist: { type: 'boolean' } } },
    description: '없는 경우 false',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 문제인 경우' })
  async checkUserEmail(@Body() body: EmailDto) {
    const { email } = body;
    const isExist = await this.userService.isExistEmail(email);
    return { isExist };
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
    const isExist = await this.userService.isExistNickname(nickname);
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
    @UserDeco() user: User,
    @Body() body: Pick<LoginLocalUserDto, 'password'>,
  ) {
    const { password } = body;
    const isCorrect = await this.authService.verifyLocalAuth(user.id, password);
    return plainToInstance(ResCheckPwDto, { isCorrect });
  }

  /** 비밀번호 변경 , 프로필과 따로 뺀 이유 : 이메일 인증 코드 확인 후 변경 */
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiBadRequestResponse({
    description: '해당 이메일로 가입된 계정이 없는 경우',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패' })
  async resetPw(@Body() body: LoginLocalUserDto) {
    await this.accountService.changePassword(body.email, body.password);
  }

  /** 유저 프로필 변경 */
  @Patch('/profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @JwtAuth('access')
  @ApiOperation({ summary: '프로필 변경' })
  @ApiBody({
    description: '사용자 프로필의 특정 필드를 업데이트합니다.',
    type: PatchUserProfileDto,
    examples: PatchUserProfileDto.getExample(),
  })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패한 경우' })
  async updateUserProfile(
    @Body() body: PatchUserProfileDto,
    @UserDeco('id') userId: number,
  ) {
    await this.accountService.profileUpdate(userId, body);
  }

  /** 해당 유저의 상대 팀 전적 및 승리 중 홈 비율 기록 */
  @Get('me/versus-record')
  @JwtAuth('access')
  @ApiOkResponse({
    type: OverallOppTeamDto,
    description: 'oppTeam의 key는 팀의 아이디',
  })
  @ApiOperation({ summary: '해당 유저의 상대 팀 전적 및 승리 중 홈 비율 기록' })
  async getUserStats(@UserDeco('id') userId: number) {
    const result = this.rankService.userStatsWithVerseTeam(userId);
    return plainToInstance(OverallOppTeamDto, result);
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
  async getUserInfo(@UserDeco() user: User) {
    const { id: userId } = user;
    const record = await this.rankService.userOverallGameStats(userId);
    const socialAuths =
      await this.authService.getUserWithSocialAuthList(userId);
    const foundUser = await this.userService.getUser({ id: userId });

    const userDto = new UserMeResDto(foundUser, socialAuths);

    return new UserMyPageDto(userDto, record);
  }

  /** 회원 탈퇴 */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @JwtAuth('access')
  @ApiOperation({ summary: '회원탈퇴' })
  @ApiNoContentResponse({ description: '삭제 성공한 경우 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 삭제 실패한 경우' })
  async deleteUser(@UserDeco() user: User, @Res() res: Response) {
    const domain = this.configService.get('DOMAIN');
    const nodeEnv = this.configService.get('NODE_ENV');

    await this.userService.deleteUser(user);
    res.clearCookie('token', {
      maxAge: 0,
      domain: domain || 'localhost',
      httpOnly: true,
      secure: nodeEnv === 'production' || nodeEnv === 'staging',
      sameSite: nodeEnv === 'staging' ? 'none' : 'lax',
    });
    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @Post('term/agreement')
  @JwtAuth('access')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '약관 동의' })
  @ApiBody({ type: TermAgreeDto })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패한 경우' })
  async agreeTerm(@UserDeco() user: User, @Body() body: TermAgreeDto) {
    const { termIds } = body;

    await this.userService.agreeTerm(user, termIds);
  }
}
