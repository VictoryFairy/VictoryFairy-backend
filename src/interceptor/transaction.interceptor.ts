import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);
  constructor(private readonly dataSource: DataSource) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const queryRunner = this.dataSource.createQueryRunner();

    req.qrManager = queryRunner.manager;

    await queryRunner.connect();
    await queryRunner.startTransaction();

    return next.handle().pipe(
      catchError(async (error) => {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();

        if (error instanceof HttpException) {
          throw error;
        } else {
          throw new InternalServerErrorException(error.message);
        }
      }),
      tap(async () => {
        await queryRunner.commitTransaction();
        await queryRunner.release();
      }),
    );
  }
}
