import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { IDotenv } from 'src/core/config/dotenv.interface';
import { SlackService } from 'src/core/slack/slack.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction: boolean;
  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService<IDotenv>,
  ) {
    this.isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }
  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    Sentry.captureException(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const { method, url, extractedIp, userAgent } = request;
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
        `${method} ${url} ${httpStatus} - \n${userAgent} / ${extractedIp} \nError: ${responseBody.message} \nErrorStack : ${(exception as any).stack}`,
      );
      if (this.isProduction) {
        await this.slackService.sendInternalErrorNotification(
          responseBody.message,
          (exception as any).name,
        );
      }
    } else {
      this.logger.warn(
        `${method} ${url} ${httpStatus} - \n${userAgent} / ${extractedIp} \nError: ${responseBody.message}`,
      );
    }

    response.status(httpStatus).json(responseBody);
  }
}
