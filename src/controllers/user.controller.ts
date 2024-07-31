import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from 'src/dtos/create-user.dto';
import { UserService } from 'src/services/user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '이메일 중복 확인' })
  @Post('/check/email')
  checkUserEmail(@Body() body: Pick<CreateUserDto, 'email'>) {
    const { email } = body;
    return this.userService.isExistEmail(email);
  }

  @ApiOperation({ summary: '닉네임 중복 확인' })
  @Post('/check/nickname')
  checkUserNickname(@Body() body: Pick<CreateUserDto, 'nickname'>) {
    const { nickname } = body;
    return this.userService.isExistNickname(nickname);
  }
}
