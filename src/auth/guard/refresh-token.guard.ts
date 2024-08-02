import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 여기에 실제 인증 로직이 들어감
    return true; // 항상 인증 성공으로 가정
  }
}