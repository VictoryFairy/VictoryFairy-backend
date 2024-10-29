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

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    if (responseBody.statusCode >= 500 && isProd) {
      await this.slackService.sendInternalErrorNotification(
        responseBody.message,
        (exception as any).name,
        (exception as any).stack,
      );
    }

    this.logger.error(
      `${method} ${url} ${httpStatus} - \n${userAgent} ${ip} \nError: ${responseBody.message} \nErrorStack : ${(exception as any).stack}`,
    );

    response.status(httpStatus).json(responseBody);
  }
}
