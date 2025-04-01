import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, userAgent, extractedIp } = request;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const statusCode = response.statusCode;

        if (userAgent.includes('ELB-HealthChecker')) {
          return;
        }

        this.logger.log(
          `${method} ${url} ${statusCode} - \x1b[33m+${responseTime}ms\x1b[32m \n${userAgent} / ${extractedIp} `,
        );
      }),
    );
  }
}
