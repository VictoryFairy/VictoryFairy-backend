import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';

export const UserDeco = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    let user;
    if (process.env.NODE_ENV !== 'production') {
      user = new User();
      user.id = 1;
      user.email = 'example@example.com';
      user.password = 'should be hidden';
      user.nickname = 'nickname example';
      user.profile_image = 'url/to/example/image';
      user.score = 1000;

      const exampleSupportTeam = new Team();
      exampleSupportTeam.id = 1;
      exampleSupportTeam.name = '롯데';
      user.support_team = exampleSupportTeam;
    } else {
      user = req.user;
    }

    return data ? user[data] : user;
  },
);
