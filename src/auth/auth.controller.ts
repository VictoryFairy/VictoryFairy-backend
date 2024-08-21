import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDeco } from 'src/decorator/user.decorator';
import { User } from 'src/entities/user.entity';
import {
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { EmailDto, EmailWithCodeDto, LoginUserDto } from 'src/dtos/user.dto';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  /** 유저 로그인 */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiBody({
    type: LoginUserDto,
    description: '로그인에 필요한 이메일, 비밀번호',
  })
  @ApiOkResponse({
    schema: {
      properties: {
        acToken: { type: 'string' },
        teamId: { type: 'number' },
        teamName: { type: 'string' },
      },
    },
    description: '리프레쉬는 쿠키, 엑세스는 json으로 응답',
  })
  @ApiUnauthorizedResponse({ description: '아이디 또는 비밀번호가 틀린 경우' })
  async login(@Body() body: LoginUserDto, @Res() res: Response) {
    const domain = this.configService.get('DOMAIN');
    const nodeEnv = this.configService.get('NODE_ENV');
    const { acToken, rfToken, user } = await this.authService.loginUser(body);

    const rfExTime = this.configService.get('REFRESH_EXPIRE_TIME');
    const cookieOptions: CookieOptions = {
      maxAge: parseInt(rfExTime),
      domain: domain || 'localhost',
      httpOnly: true,
      secure: nodeEnv === 'production',
    };
    res.cookie('token', rfToken, cookieOptions);
    return res.json({
      acToken,
      teamId: user.support_team.id,
      teamName: user.support_team.name,
    });
  }

  /** 유저 로그아웃 */
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('refresh')
  @ApiOperation({ summary: '로그아웃' })
  @ApiOkResponse({ description: '성공 시 데이터 없이 상태코드만 응답' })
  logout(@Res() res: Response) {
    const nodeEnv = this.configService.get('NODE_ENV');
    const domain = this.configService.get('DOMAIN');
    res.clearCookie('token', {
      domain: domain || 'localhost',
      httpOnly: true,
      secure: nodeEnv === 'production',
    });
    return res.sendStatus(HttpStatus.OK);
  }

  /** 유저 리프레쉬 토큰 확인 */
  @Post('token/check')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('refresh')
  @ApiOperation({ summary: '리프레쉬 토큰 확인' })
  @ApiOkResponse({ description: '리프레쉬 토큰이 맞는 경우 상태코드만 응답' })
  async checkRefreshToken() {}

  /** 엑세스 토큰 재발급 */
  @Post('token/issue')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('refresh')
  @ApiOperation({ summary: '엑세스 토큰 재발급' })
  @ApiOkResponse({
    schema: { properties: { acToken: { type: 'string' } } },
    description: '새로운 엑세스 토큰 발급',
  })
  async reissueAcToken(@UserDeco() user: User): Promise<{ acToken: string }> {
    const { email, id } = user;
    const acToken = this.authService.issueToken({ email, id }, false);
    return { acToken };
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
}
