import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { UserDeco } from 'src/decorator/user.decorator';
import { User } from 'src/entities/user.entity';
import {
  ApiBody,
  ApiCookieAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginUserDto } from 'src/dtos/login-user.dto';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { EmailDto, EmailWithCodeDto } from 'src/dtos/check-code.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: CreateUserDto, description: '회원가입에 필요한 정보' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '성공 시 데이터 없이 상태코드만 응답',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 유저 저장 실패한 경우' })
  async signIn(@Body() body: CreateUserDto) {
    await this.authService.registerUser(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiBody({
    type: LoginUserDto,
    description: '로그인에 필요한 이메일, 비밀번호',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: { acToken: { type: 'string' } },
    },
    description: '리프레쉬는 쿠키, 엑세스는 json으로 응답',
  })
  @ApiUnauthorizedResponse({ description: '아이디 또는 비밀번호가 틀린 경우' })
  async login(@Body() body: LoginUserDto, @Res() res: Response) {
    const { acToken, rfToken } = await this.authService.loginUser(body);

    const rfExTime = this.configService.get('REFRESH_EXPIRE_TIME');
    const cookieOptions: CookieOptions = {
      maxAge: parseInt(rfExTime),
      httpOnly: true,
    };
    res.cookie('token', rfToken, cookieOptions);
    res.json({ acToken });
  }

  @Post('token/issue')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '엑세스 토큰 재발급' })
  @ApiCookieAuth('token')
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { properties: { acToken: { type: 'string' } } },
    description: '새로운 엑세스 토큰 발급',
  })
  @ApiUnauthorizedResponse({
    description: '유효하지 않은 리프레쉬 토큰 제출한 경우',
  })
  async reissueAcToken(@UserDeco() user: User): Promise<{ acToken: string }> {
    const { email, id } = user;
    const acToken = this.authService.issueToken({ email, id }, false);
    return { acToken };
  }

  @Post('code/email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '인증 번호 이메일 요청' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '성공 시 데이터 없이 상태코드만 응답',
  })
  @ApiInternalServerErrorResponse({
    description: '이메일 전송 실패 / 인증 코드 레디스 저장 실패한 경우',
  })
  async sendAuthCode(@Body() body: EmailDto) {
    await this.authService.makeCodeAndSendMail(body.email);
  }

  @Post('code/verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '유저가 제출한 인증번호 확인' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '성공 시 데이터 없이 상태코드만 응답',
  })
  @ApiUnauthorizedResponse({ description: '인증코드 틀린 경우' })
  @ApiInternalServerErrorResponse({ description: '레디스 관련 문제인 경우' })
  checkEmailCode(@Body() body: EmailWithCodeDto) {
    return this.authService.verifyEmailCode(body);
  }
}
