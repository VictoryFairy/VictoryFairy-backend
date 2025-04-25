import {
  All,
  BadRequestException,
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { OAuthStatus, SocialProvider } from 'src/modules/auth/const/auth.const';
import {
  EmailDto,
  EmailWithCodeDto,
  LoginLocalUserDto,
} from 'src/modules/user/dto/user.dto';
import { AccountService } from 'src/modules/account/account.service';
import { ProviderParamCheckPipe } from 'src/common/pipe/provider-param-check.pipe';
import { SocialFlowType } from 'src/modules/auth/types/auth.type';
import { SocialFlowParamPipe } from 'src/common/pipe/social-flow-param-check.pipe';
import { SocialAuthGuard } from 'src/common/guard/social-auth.guard';
import { SocialPostGuard } from 'src/common/guard/social-post.guard';
import { AccessTokenGuard } from 'src/common/guard/access-token.guard';
import { Throttle } from '@nestjs/throttler';
import { PidReqDto } from './dto/request/req-pid.dto';
import { CreateSocialAuthDto } from './dto/internal/social-auth/create-social-auth.dto';
import { UserService } from '../user/user.service';
import { AccessTokenResDto } from './dto/response/res-aceess-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  /** 유저 로그인 */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiBody({
    type: LoginLocalUserDto,
    description: '로그인에 필요한 이메일, 비밀번호',
  })
  @ApiOkResponse({
    type: AccessTokenResDto,
    description: '리프레쉬는 쿠키, 엑세스는 json으로 응답',
  })
  @ApiUnauthorizedResponse({ description: '아이디 또는 비밀번호가 틀린 경우' })
  async localLogin(@Body() body: LoginLocalUserDto, @Res() res: Response) {
    const { email, id, support_team } =
      await this.accountService.loginLocalUser(body);

    const [rfToken, acToken] = [
      this.authService.issueToken({ email, id }, 'refresh'),
      this.authService.issueToken({ email, id }, 'access'),
    ];

    const rfExTime = this.configService.get('REFRESH_EXPIRE_TIME');
    res.cookie('token', rfToken, this.getCookieOptions(parseInt(rfExTime)));
    res.json({ acToken, teamId: support_team.id, teamName: support_team.name });
  }

  /** 소셜 로그인 진입점 */
  @Get('login/:provider')
  @UseGuards(SocialAuthGuard)
  @ApiOperation({ summary: '소셜 로그인 요청' })
  @ApiResponse({
    status: 302,
    description: [
      '콜백 처리 후 프론트엔드 콜백 페이지(`/oauth/callback`)로 리다이렉트됩니다.',
      '**쿼리 파라미터 목록:**',
      '- `status`: 처리 결과 상태 (success | fail)',
      '- `flow_type`: 소셜 로그인 흐름 (login | link)',
      '- `pid`: 임시 인증 식별자 (uuid)',
      '- `provider`: 소셜 플랫폼 이름 (google | kakao | apple 등)',
      '',
      '**Success 예시:** :',
      'https://frontend.com/oauth/callback?status=success&flow_type=login&pid=1234&provider=google',
      '',
      '**Fail 예시:** :',
      'https://frontend.com/oauth/callback?status=fail',
    ].join('\n'),
  })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  async socialLogin() {}

  /** 소셜 계정 연동 진입점 */
  @Get('link/:provider')
  @JwtAuth('refresh', SocialAuthGuard)
  @ApiOperation({ summary: '계정 연동 요청 - 리프레쉬 토큰 필요(엑세스 X)' })
  @ApiResponse({
    status: 302,
    description: [
      '콜백 처리 후 프론트엔드 콜백 페이지(`/oauth/callback`)로 리다이렉트됩니다.',
      '**쿼리 파라미터 목록:**',
      '- `status`: 처리 결과 상태 (success | fail)',
      '- `flow_type`: 소셜 로그인 흐름 (login | link)',
      '- `pid`: 임시 인증 식별자 (uuid)',
      '- `provider`: 소셜 플랫폼 이름 (google | kakao | apple 등)',
      '',
      '**Success 예시:** :',
      'https://frontend.com/oauth/callback?status=success&flow_type=link&pid=1234&provider=google',
      '',
      '**Fail 예시:** :',
      'https://frontend.com/oauth/callback?status=fail',
    ].join('\n'),
  })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  async socialLink() {}

  /** 소셜 플랫폼에서 리다이렉트 처리 엔드포인트 및 코드 캐싱 후 프론트에 pid 전달 */
  @ApiExcludeEndpoint() // 스웨거 문서에서 제외
  @All(':flowType/:provider/callback')
  @UseGuards(SocialAuthGuard)
  async handleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Param('provider', ProviderParamCheckPipe) provider: SocialProvider,
    @Param('flowType', SocialFlowParamPipe) flowType: SocialFlowType,
  ) {
    if (flowType !== req.flowType) {
      throw new BadRequestException('유효하지 않은 url');
    }
    const frontendUrl = new URL(
      `oauth/callback`,
      this.configService.get('FRONT_END_URL'),
    );
    // 소셜로그인 처리 중 오류가 발생한 경우 : 리다이렉트로 보내면서 상태 보내기
    if (req.socialAuthError || !req.flowType || !req.pid) {
      frontendUrl.searchParams.set('status', OAuthStatus.FAIL);
      return res.redirect(frontendUrl.href);
    }

    const params = new URLSearchParams({
      status: OAuthStatus.SUCCESS,
      flow_type: flowType,
      pid: req.pid,
      provider,
    });

    frontendUrl.search = params.toString();

    return res.redirect(frontendUrl.href);
  }

  /** pid받아서 소셜 플랫폼의 유저 정보 확인 후 계정 회원가입 및 로그인 처리 */
  @ApiOperation({ summary: 'pid로 소셜 로그인 및 회원가입 처리 요청' })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiOkResponse({
    type: AccessTokenResDto,
    description: [
      '리프레쉬는 쿠키, 엑세스는 json으로 응답',
      '',
      '회원가입한 유저는 teamId, teamName이 Null',
      '',
      '로그인 유저는 teamId, teamName이 정상적으로 응답',
    ].join('\n'),
  })
  @ApiUnauthorizedResponse({ description: '유효하지 않거나 만료된 pid인 경우' })
  @ApiBadRequestResponse({ description: '유효하지 않은 provider인 경우' })
  @ApiConflictResponse({ description: '이미 해당 이메일로 가입한 경우' })
  @ApiInternalServerErrorResponse({ description: '소셜 로그인 처리 실패' })
  @Post('login/:provider/handle')
  @UseGuards(SocialPostGuard)
  async handleSocialLogin(
    @Param('provider', ProviderParamCheckPipe) provider: SocialProvider,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: PidReqDto,
  ) {
    if (!req.socialUserInfo) {
      throw new BadRequestException('소셜 유저 정보 없음');
    }
    const { sub, email: providerEmail } = req.socialUserInfo;

    const { user, isNewUser } = await this.accountService.loginSocialUser(
      sub,
      providerEmail,
      provider,
    );

    const [rfToken, acToken] = [
      this.authService.issueToken(
        { email: user.email, id: user.id },
        'refresh',
      ),
      this.authService.issueToken({ email: user.email, id: user.id }, 'access'),
    ];

    const rfExTime = this.configService.get('REFRESH_EXPIRE_TIME');
    res.cookie('token', rfToken, this.getCookieOptions(parseInt(rfExTime)));
    res.json({
      acToken,
      teamId: isNewUser ? null : user.support_team.id,
      teamName: isNewUser ? null : user.support_team.name,
    });
  }

  /** pid받아서 소셜 플랫폼의 유저 정보 확인 후 계정 연동 처리 */
  @ApiOperation({ summary: 'pid로 소셜 연동 처리 요청, Access 토큰 필요' })
  @ApiBearerAuth('access')
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiNoContentResponse({ description: '성공 시 상태코드만 응답' })
  @ApiConflictResponse({
    description: '이미 해당 계정으로 연동되어 있거나 가입되어 있는 경우',
  })
  @ApiUnauthorizedResponse({
    description:
      '유효하지 않거나 만료된 pid인 경우 또는 엑세스 토큰이 유효하지 않은 경우',
  })
  @ApiBadRequestResponse({ description: '유효하지 않은 provider인 경우' })
  @ApiInternalServerErrorResponse({ description: '소셜 연동 처리 실패' })
  @Post('link/:provider/handle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard, SocialPostGuard)
  async handleSocialLink(
    @Param('provider', ProviderParamCheckPipe) provider: SocialProvider,
    @Req() req: Request,
    @CurrentUser('id') userId: number,
    @Body() body: PidReqDto,
  ) {
    if (!req.socialUserInfo) {
      throw new BadRequestException('소셜 유저 정보 없음');
    }
    const { sub, email: providerEmail } = req.socialUserInfo;
    const socialAuthData = await CreateSocialAuthDto.createAndValidate({
      sub,
      provider,
      userId,
      providerEmail,
      isPrimary: false,
    });
    await this.accountService.linkSocial(socialAuthData);
  }

  /** 소셜 계정 연동 해제*/
  @Delete('link/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @JwtAuth('access')
  @ApiOperation({ summary: '소셜 계정 연동 해제, 엑세스 토큰 필요' })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiBadRequestResponse({
    description: '유효하지 않은 요청 url or 계정 연동 해제 할 수 없는 경우',
  })
  @ApiForbiddenResponse({
    description: '소셜플랫폼 처음 회원가입 이메일 연동 해제 불가능',
  })
  async deleteSocialLink(
    @Param('provider', ProviderParamCheckPipe)
    provider: SocialProvider,
    @CurrentUser('id') userId: number,
  ) {
    await this.accountService.unlinkSocial({
      userId,
      provider,
    });
  }

  /** 유저 로그아웃 */
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('refresh')
  @ApiOperation({ summary: '로그아웃' })
  @ApiOkResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  logout(@Res() res: Response) {
    res.clearCookie('token', this.getCookieOptions(0));
    return res.sendStatus(HttpStatus.OK);
  }

  /** 유저 리프레쉬 토큰 확인 */
  @Post('token/check')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('refresh')
  @ApiOperation({ summary: '리프레쉬 토큰 확인' })
  @ApiOkResponse({
    description:
      '리프레쉬 토큰이 맞는 경우 200상태코드와 유저가 동의하지 않은 필수 약관 목록 반환, 빈 배열인 경우 필수 약관 동의한 상태',
    schema: {
      properties: {
        notAgreedRequiredTerm: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async checkRefreshToken(@CurrentUser('id') userId: number) {
    return await this.accountService.checkUserAgreedRequiredTerm(userId);
  }

  /** 엑세스 토큰 재발급 */
  @Post('token/issue')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('refresh')
  @ApiOperation({ summary: '엑세스 토큰 재발급' })
  @ApiOkResponse({
    type: AccessTokenResDto,
    description: '새로운 엑세스 토큰 발급',
  })
  async reissueAcToken(
    @CurrentUser('id') userId: number,
  ): Promise<AccessTokenResDto> {
    const { email, id, support_team } =
      await this.userService.getUserWithSupportTeam({ id: userId });
    const acToken = this.authService.issueToken({ email, id }, 'access');
    return { acToken, teamId: support_team.id, teamName: support_team.name };
  }

  /** 인증 코드 메일 전송 */
  @Throttle({ default: { limit: 1, ttl: 30 } }) // 30초에 1번만 요청 가능
  @Post('email-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '인증 번호 이메일 요청' })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiInternalServerErrorResponse({
    description: '이메일 전송 실패 / 인증 코드 레디스 저장 실패한 경우',
  })
  async sendAuthCode(@Body() body: EmailDto) {
    await this.authService.makeCodeAndSendMail(body.email);
  }

  /** 인증코드와 이매일 매칭 확인 */
  @Post('verify-email-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '유저가 제출한 인증번호 확인' })
  @ApiNoContentResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  @ApiUnauthorizedResponse({ description: '인증코드 틀린 경우' })
  @ApiInternalServerErrorResponse({ description: '레디스 관련 문제인 경우' })
  async checkEmailCode(@Body() body: EmailWithCodeDto) {
    await this.authService.verifyEmailCode(body);
  }

  private getCookieOptions(maxAge: number): CookieOptions {
    const domain = this.configService.get('DOMAIN');
    const nodeEnv = this.configService.get('NODE_ENV');

    return {
      maxAge,
      domain: domain || 'localhost',
      httpOnly: true,
      secure: nodeEnv === 'production' || nodeEnv === 'staging',
      sameSite: nodeEnv === 'staging' ? 'none' : 'lax',
    };
  }
}
