import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlackService } from 'src/services/slack.service';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);
  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService,
  ) {}
  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    // 이미 응답이 나간 상태면 아무것도 안 하고 종료
    if (response.headersSent) {
      return;
    }

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isInternalServerError =
      httpStatus === HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody = {
      statusCode: httpStatus,
      message: isInternalServerError
        ? 'Internal Server Error'
        : (exception as any).message,
      error: isInternalServerError
        ? 'Internal Server Error'
        : (exception as any).name,
    };

    if (responseBody.statusCode >= 500) {
      this.logger.error(
        `${method} ${url} ${httpStatus} - \n${userAgent} ${ip} \nError: ${responseBody.message} \nErrorStack : ${(exception as any).stack}`,
      );
      const isProd =
        this.configService.get<string>('NODE_ENV') === 'production';
      if (isProd) {
        await this.slackService.sendInternalErrorNotification(
          responseBody.message,
          (exception as any).name,
          (exception as any).stack,
        );
      }
    } else {
      this.logger.warn(
        `${method} ${url} ${httpStatus} - \n${userAgent} ${ip} \nError: ${responseBody.message}`,
      );
    }

    response.status(httpStatus).json(responseBody);
  }
}
