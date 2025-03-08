import {
  All,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDeco } from 'src/decorator/user.decorator';
import { User } from 'src/entities/user.entity';
import {
  ApiBody,
  ApiCookieAuth,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiTemporaryRedirectResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { SocialProvider } from 'src/const/auth.const';
import { AccessTokenResDto } from 'src/dtos/auth.dto';
import {
  EmailDto,
  EmailWithCodeDto,
  LoginLocalUserDto,
} from 'src/dtos/user.dto';
import { SocialAuthGuard } from './guard/social-auth.guard';
import { ISocialUserInfo } from 'src/types/auth.type';
import { AccountService } from 'src/account/account.service';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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
    const { user } = await this.accountService.loginLocalUser(body);

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
      teamId: user.support_team.id,
      teamName: user.support_team.name,
    });
  }

  /** 소셜 로그인 진입점 */
  @Get('login/:provider')
  @UseGuards(SocialAuthGuard)
  @ApiOperation({ summary: '소셜 로그인 요청' })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiTemporaryRedirectResponse({
    description: '소셜 로그인 페이지로 리다이렉트',
  })
  async socialLogin() {}

  /** 소셜 로그인 리다이렉트 처리 엔드포인트 */
  @All('login/:provider/callback')
  @UseGuards(SocialAuthGuard)
  @ApiOperation({ summary: '소셜 로그인 콜백 (GET, POST 지원)' })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiResponse({
    status: 302,
    description:
      '프론트엔드로 리다이렉트. 리다이렉트 URL (status: LOGIN | SIGNUP | DUPLICATE | FAIL)',
    schema: {
      type: 'string',
      example: 'https://frontend.com/social-login?status=SUCCESS',
    },
  })
  async handleCallback(
    @Req() req: Request & { socialUserInfo: ISocialUserInfo },
    @Res() res: Response,
    @Param('provider') provider: SocialProvider,
  ) {
    const { sub, email } = req.socialUserInfo;

    const loginResult = await this.accountService.loginSocialUser(
      sub,
      email,
      provider,
    );

    const rfToken = this.authService.issueToken(
      { email: email, id: loginResult.user.id },
      'refresh',
    );
    const rfExTime = this.configService.get('REFRESH_EXPIRE_TIME');
    res.cookie('token', rfToken, this.getCookieOptions(parseInt(rfExTime)));

    const frontendUrl = new URL(this.configService.get('FRONT_END_URL'));
    frontendUrl.searchParams.set('status', loginResult.status);
    return res.redirect(frontendUrl.href);
  }

  /** 소셜 계정 연동 진입점 */
  @Get('link/:provider')
  @JwtAuth('refresh', SocialAuthGuard)
  @ApiCookieAuth('token')
  @ApiOperation({ summary: '계정 연동 요청' })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiTemporaryRedirectResponse({
    description: '소셜 로그인 페이지로 리다이렉트',
  })
  async socialLink() {}

  /** 소셜 계정 연동 콜백처리 */
  @All('link/:provider/callback')
  @UseGuards(SocialAuthGuard)
  @ApiOperation({ summary: '소셜 계정 연동 콜백 (GET, POST 지원)' })
  @ApiParam({
    name: 'provider',
    enum: SocialProvider,
    description: '소셜 로그인 제공자',
  })
  @ApiResponse({
    status: 302,
    description:
      '프론트엔드로 리다이렉트. 리다이렉트 URL (status: SUCCESS | DUPLICATE | FAIL)',
    schema: {
      type: 'string',
      example: 'https://frontend.com/social-link?status=SUCCESS',
    },
  })
  async handleSocialLinkCallback(
    @Req()
    req: Request & {
      socialUserInfo: ISocialUserInfo;
      cachedUser: { id: number; provider: SocialProvider };
    },
    @Res() res: Response,
    @Param('provider') provider: SocialProvider,
  ) {
    const { id } = req.cachedUser;
    const { sub } = req.socialUserInfo;
    const { status } = await this.accountService.linkSocial({
      user_id: id,
      sub,
      provider,
    });
    const frontendUrl = new URL(
      '/mypage',
      this.configService.get('FRONT_END_URL'),
    );

    frontendUrl.searchParams.set('status', status);
    return res.redirect(frontendUrl.href); // mypage로 리다이렉트
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
  async checkRefreshToken(@UserDeco() user: User) {
    return await this.accountService.checkUserAgreedRequiredTerm(user.id);
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
  async reissueAcToken(@UserDeco() user: User): Promise<AccessTokenResDto> {
    const { email, id, support_team } = user;
    const acToken = this.authService.issueToken({ email, id }, 'access');
    return { acToken, teamId: support_team.id, teamName: support_team.name };
  }

  /** 인증 코드 메일 전송 */
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
