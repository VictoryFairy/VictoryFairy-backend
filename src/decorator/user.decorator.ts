import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';

export const UserDeco = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    // 여기서는 모킹된 사용자 정보를 반환
    const user = new User();
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
    
    return user;
  },
);