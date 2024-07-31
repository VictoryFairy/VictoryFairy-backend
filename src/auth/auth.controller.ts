import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { UserDeco } from 'src/decorator/user.decorator';
import { User } from 'src/entities/user.entity';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginUserDto } from 'src/dtos/login-user.dto';
import { AuthCodeDto } from 'src/dtos/auth-code.dto';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sign-up')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: CreateUserDto, description: '회원가입에 필요한 정보' })
  async signIn(@Body() body: CreateUserDto): Promise<{ id: number }> {
    return this.authService.registerUser(body);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiBody({
    type: LoginUserDto,
    description: '로그인에 필요한 이메일, 비밀번호',
  })
  @HttpCode(200)
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

  @Post('issue-access-token')
  @ApiOperation({ summary: '엑세스 토큰 재발급' })
  @UseGuards(RefreshTokenGuard)
  async reissueAcToken(@UserDeco() user: User): Promise<{ acToken: string }> {
    const { email, id } = user;
    const acToken = this.authService.issueToken({ email, id }, false);
    return { acToken };
  }

  @Post('reset/pw')
  @ApiOperation({ summary: '비밀번호 초기화' })
  async resetPw(@Body() body: AuthCodeDto) {}
}
