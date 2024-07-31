import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { UserDeco } from 'src/decorator/user.decorator';
import { User } from 'src/entities/user.entity';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginUserDto } from 'src/dtos/login-user.dto';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { AuthCodeDto } from 'src/dtos/auth-code.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  async login(
    @Body() body: LoginUserDto,
  ): Promise<{ acToken: string; rfToken: string }> {
    return this.authService.loginUser(body);
  }

  @Post('reissue-access-token')
  @ApiOperation({ summary: '엑세스 토큰 재발급' })
  @UseGuards(RefreshTokenGuard)
  async reissueAcToken(@UserDeco() user: User): Promise<{ acToken: string }> {
    const { email, id } = user;
    const acToken = this.authService.issueToken({ email, id }, false);
    return { acToken };
  }

  @ApiOperation({ summary: '비밀번호 초기화' })
  @Post('reset/pw')
  async resetPw(@Body() body: AuthCodeDto) {}
}
