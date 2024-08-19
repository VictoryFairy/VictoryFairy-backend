import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const QueryRunnerManager = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const qrManager = req.qrManager;

    return qrManager;
  },
);
