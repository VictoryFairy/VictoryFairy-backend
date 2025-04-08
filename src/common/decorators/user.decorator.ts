import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { IJwtPayload } from 'src/modules/auth/types/auth.type';

export const UserDeco = createParamDecorator(
  (data: keyof IJwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    return data ? user[data] : user;
  },
);
