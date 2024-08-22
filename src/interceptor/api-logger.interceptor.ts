import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const statusCode = response.statusCode;

        this.logger.log(
          `${method} ${url} ${statusCode} - ${responseTime}ms  \n${userAgent} ${ip} `,
        );
      }),
      catchError((error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;
        this.logger.error(
          `${method} ${url} ${statusCode} - ${responseTime}ms \n${userAgent} ${ip}  \nError: ${error.message} \nErrorStack : ${error.stack}`,
        );

        throw error;
      }),
    );
  }
}
