import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Put,
  HttpCode,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guard/access-token.guard';
import { UserDeco } from 'src/decorator/user.decorator';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { EmailDto, NicknameDto } from 'src/dtos/duplicate-user.dto';
import { LoginUserDto } from 'src/dtos/login-user.dto';
import { UserProfileDto } from 'src/dtos/profile-user.dto';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/services/user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** 유저 회원가입 */
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: CreateUserDto, description: '회원가입에 필요한 정보' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '성공 시 데이터 없이 상태코드만 응답',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 유저 저장 실패한 경우' })
  async signIn(@Body() body: CreateUserDto) {
    await this.userService.createUser(body);
  }

  /** 이메일 중복 확인 */
  @Post('/exist/email')
  @ApiOperation({ summary: '이메일 중복 확인' })
  @ApiResponse({
    status: HttpStatus.OK,
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
  @Post('/exist/nickname')
  @ApiOperation({ summary: '닉네임 중복 확인' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { properties: { isExist: { type: 'boolean' } } },
    description: '없는 경우 false',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 문제인 경우' })
  async checkUserNick(@Body() body: NicknameDto) {
    const { nickname } = body;
    const isExist = await this.userService.isExistNickname(nickname);
    return { isExist };
  }
  /** 비밀번호 변경 , 프로필과 따로 뺀 이유 : 이메일 인증 코드 확인 후 변경 */
  @Put('/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '성공 시 데이터 없이 상태코드만 응답',
  })
  @ApiBadRequestResponse({
    description: '해당 이메일로 가입된 계정이 없는 경우',
  })
  @ApiInternalServerErrorResponse({ description: 'DB 업데이트 실패' })
  async resetPw(@Body() body: LoginUserDto) {
    await this.userService.changeUserPw(body);
  }

  /** 유저 프로필 변경 */
  @Put('/profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ description: '프로필 변경' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async updateUserProfile(
    @Body() body: UserProfileDto,
    @UserDeco() user: User,
  ) {
    const objToArr = Object.keys(body);
    if (objToArr.length !== 1) {
      throw new BadRequestException(
        '적절한 데이터가 아니거나 2개 이상의 데이터가 요청됨',
      );
    }
    await this.userService.changeUserProfile(body, user);
  }
}
