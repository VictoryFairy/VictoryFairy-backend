import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseDomainError } from '../error/base-domain.error';
import { DOMAIN_ERROR_HTTP_MAP } from '../error/domain-error-http-map';
import * as Sentry from '@sentry/node';
import { SlackService } from 'src/infra/external-channel/slack.service';
import { ConfigService } from '@nestjs/config';
import { IDotenv } from 'src/config/dotenv.interface';

@Catch(BaseDomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);
  private readonly isProduction: boolean;
  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService<IDotenv>,
  ) {
    this.isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  async catch(exception: BaseDomainError, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const { method, url } = request;
    const httpStatus =
      DOMAIN_ERROR_HTTP_MAP[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      const responseBody = {
        statusCode: httpStatus,
        message: 'Internal Server Error',
        error: 'Internal Server Error',
      };
      this.logger.error(
        `${method} ${url} ${httpStatus} - Domain Error: ${exception.message}`,
        exception.stack,
      );
      if (this.isProduction) {
        Sentry.captureException(exception);
        await this.slackService.sendInternalErrorNotification(
          `${method} ${url} - ${responseBody.message}`,
          exception.name,
        );
      }
      response.status(httpStatus).json(responseBody);
      return;
    } else {
      const responseBody = {
        statusCode: httpStatus,
        message: exception.message,
        error: exception.name,
      };
      this.logger.warn(
        `${method} ${url} ${httpStatus} - Domain Error: [${exception.code}] ${exception.message}`,
      );
      response.status(httpStatus).json(responseBody);
      return;
    }
  }
}
