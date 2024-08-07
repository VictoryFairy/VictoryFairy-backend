import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let message: string;

    switch ((exception as any).code) {
      case '23505': // 고유 제약 조건 위반
        statusCode = HttpStatus.CONFLICT;
        message = exception.message;
        break;
      case '23503': // 외래 키 제약 조건 위반
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message;
        break;
      case '23502': // NOT NULL 제약 조건 위반
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message;
        break;
      case '23514': // CHECK 제약 조건 위반
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message;
        break;
      default:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = exception.message;
        break;
    }

    response.status(statusCode).json({
      statusCode: statusCode,
      message: message,
      error: exception.name,
    });
  }
}
