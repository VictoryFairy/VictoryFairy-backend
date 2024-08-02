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
      user.score = 0;

      const exampleCheeringTeam = new Team();
      exampleCheeringTeam.id = 1;
      exampleCheeringTeam.name = 'example';
      user.cheering_team = exampleCheeringTeam;
    } else {
      user = req.user;
    }

    return data ? user[data] : user;
  },
);
