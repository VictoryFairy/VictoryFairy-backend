import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}